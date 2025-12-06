import { FeedCacheDAOFactory } from "../../src/dao/factory/FeedCacheDAOFactory";
import { FeedCacheDAO } from "../../src/dao/interface/FeedCacheDAO";
import { FollowDAOFactory } from "../../src/dao/factory/FollowDAOFactory";
import { FollowDAO } from "../../src/dao/interface/FollowDAO";
import { UserDAOFactory } from "../../src/dao/factory/UserDAOFactory";
import { UserDAO } from "../../src/dao/interface/UserDAO";
import { StatusDto } from "tweeter-shared";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, ScanCommandOutput } from "@aws-sdk/lib-dynamodb";

async function getAllPosts(): Promise<StatusDto[]> {
  console.log("📖 Scanning status table for all posts...");
  const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  const posts: StatusDto[] = [];

  let lastEvaluatedKey: Record<string, any> | undefined = undefined;

  do {
    const scanResult: ScanCommandOutput = await client.send(
      new ScanCommand({
        TableName: "status",
        ExclusiveStartKey: lastEvaluatedKey,
      })
    );

    if (scanResult.Items) {
      posts.push(
        ...scanResult.Items.map((item: any) => ({
          statusId: item.statusId,
          userId: item.userId,
          contents: item.contents,
          postTime: item.postTime,
        }))
      );
    }

    lastEvaluatedKey = scanResult.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  console.log(`   ✅ Found ${posts.length} posts\n`);
  return posts;
}

async function getAllFollowers(
  followDAO: FollowDAO,
  userId: string
): Promise<string[]> {
  const userIds: string[] = [];
  let hasMore = true;
  let lastFollowTime: number | null = null;
  let lastFollowId: string | null = null;

  while (hasMore) {
    const [userFollows, more] = await followDAO.getPageOfFollowers(
      userId,
      lastFollowTime,
      lastFollowId,
      100,
      true // activeOnly
    );

    userIds.push(...userFollows.map((uf) => uf.user.userId));
    hasMore = more;

    if (userFollows.length > 0) {
      const lastItem = userFollows[userFollows.length - 1];
      lastFollowTime = lastItem.followTime;
      lastFollowId = lastItem.followId;
    }
  }

  return userIds;
}

async function backfillFeedCache() {
  console.log("🚀 Starting feed cache backfill...\n");

  const feedCacheDAO: FeedCacheDAO = FeedCacheDAOFactory.create("dynamo");
  const followDAO: FollowDAO = FollowDAOFactory.create("dynamo");
  const userDAO: UserDAO = UserDAOFactory.create("dynamo");

  // Get all posts from status table
  const allPosts = await getAllPosts();

  if (allPosts.length === 0) {
    console.log("⚠️  No posts found in status table. Nothing to backfill.\n");
    return;
  }

  let processedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  let totalCacheWrites = 0;

  console.log("🔄 Processing posts and populating caches...\n");
  console.log("⏱️  Rate limiting enabled (1 second delay between batches to avoid throttling)\n");

  // For each post, find followers and add to their caches
  for (const post of allPosts) {
    try {
      // Get author user info
      const author = await userDAO.getUserById(post.userId);
      if (!author) {
        console.warn(`⏭️  Skipped: Post ${post.statusId} - author not found`);
        skippedCount++;
        continue;
      }

      // Hydrate post with author info
      const hydratedPost: StatusDto = { ...post, user: author };

      // Get all followers of the author
      const followerUserIds = await getAllFollowers(followDAO, post.userId);

      if (followerUserIds.length === 0) {
        console.log(`⏭️  Skipped: Post ${post.statusId} by ${author.alias} has no followers`);
        skippedCount++;
        continue;
      }

      // Add to each follower's cache
      await feedCacheDAO.batchAddToCache(followerUserIds, hydratedPost);

      processedCount++;
      totalCacheWrites += followerUserIds.length;
      const preview = post.contents.substring(0, 30).replace(/\n/g, " ");
      console.log(
        `✅ Processed ${processedCount}/${allPosts.length}: Post ${post.statusId} by ${author.alias} → ${followerUserIds.length} caches`
      );
      console.log(`   "${preview}..."`);

      // Rate limiting: wait 1 second between posts to avoid throttling with 1 WCU
      // (Each post may result in multiple BatchWrite calls)
      if (processedCount < allPosts.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`❌ Error processing post ${post.statusId}:`, error);
      errorCount++;

      // If we hit throttling, wait longer before continuing
      if ((error as any).name === "ProvisionedThroughputExceededException") {
        console.log("⏸️  Throttled - waiting 5 seconds before retrying...");
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 Backfill Summary:");
  console.log(`   Total posts scanned:     ${allPosts.length}`);
  console.log(`   Successfully processed:  ${processedCount}`);
  console.log(`   Skipped (no followers):  ${skippedCount}`);
  console.log(`   Errors:                  ${errorCount}`);
  console.log(`   Total cache writes:      ${totalCacheWrites}`);
  console.log("=".repeat(60));

  if (processedCount > 0) {
    console.log("\n✨ Feed cache backfill completed successfully!");
    console.log(`   ${totalCacheWrites} cache entries created for ${processedCount} posts`);
  }
}

// Run the script
backfillFeedCache()
  .then(() => {
    console.log("\n✅ Script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });
