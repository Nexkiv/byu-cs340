import { FollowDAOFactory } from "../../src/dao/factory/FollowDAOFactory";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  ScanCommandOutput,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

async function getAllUsers(): Promise<string[]> {
  const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  const userIds: string[] = [];
  let lastEvaluatedKey: Record<string, any> | undefined = undefined;

  console.log("📋 Scanning user table for all users...");

  do {
    const result: ScanCommandOutput = await client.send(
      new ScanCommand({
        TableName: "user",
        ProjectionExpression: "userId",
        ExclusiveStartKey: lastEvaluatedKey,
      })
    );

    if (result.Items) {
      userIds.push(...result.Items.map((item) => item.userId as string));
    }

    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  console.log(`   Found ${userIds.length} users\n`);
  return userIds;
}

async function updateUserCounts(
  userId: string,
  followDAO: any,
  client: DynamoDBDocumentClient
): Promise<void> {
  // Compute actual counts from follow table
  const followerCount = await followDAO.getFollowerCount(userId);
  const followeeCount = await followDAO.getFolloweeCount(userId);

  // Update user table with SET (not ADD) to initialize exact values
  await client.send(
    new UpdateCommand({
      TableName: "user",
      Key: { userId },
      UpdateExpression: "SET followerCount = :fc, followeeCount = :fec",
      ExpressionAttributeValues: {
        ":fc": followerCount,
        ":fec": followeeCount,
      },
    })
  );

  console.log(
    `✅ Updated ${userId}: followers=${followerCount}, followees=${followeeCount}`
  );
}

async function backfillUserCounts() {
  console.log("🚀 Starting user count backfill...\n");

  const followDAO = FollowDAOFactory.create("dynamo");
  const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

  const userIds = await getAllUsers();
  let updated = 0;
  let totalErrors = 0;
  let failedUsers: string[] = [];

  // Progress tracking - show progress every ~10% of users (min 1, max 50)
  const PROGRESS_BATCH_SIZE = Math.max(1, Math.min(50, Math.floor(userIds.length / 10)));
  let processedInBatch = 0;

  // Main pass
  console.log("📝 Main pass: Processing all users...\n");
  for (let i = 0; i < userIds.length; i++) {
    const userId = userIds[i];
    try {
      await updateUserCounts(userId, followDAO, client);
      updated++;
      processedInBatch++;

      // Rate limiting: 500ms between users
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`❌ Error processing ${userId}:`, error);
      totalErrors++;
      failedUsers.push(userId);
      processedInBatch++;

      // Adaptive throttling
      if ((error as any).name === "ProvisionedThroughputExceededException") {
        console.log("⏸️  Throttled - waiting 5 seconds...");
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    // Visual progress break
    if (processedInBatch >= PROGRESS_BATCH_SIZE || i === userIds.length - 1) {
      const processed = i + 1;
      const progressPercent = ((processed / userIds.length) * 100).toFixed(1);
      console.log("\n" + "━".repeat(60));
      console.log(
        `📊 Progress: ${processed}/${userIds.length} (${progressPercent}%) | ` +
        `Updated: ${updated} | Errors: ${totalErrors}`
      );
      console.log("━".repeat(60) + "\n");
      processedInBatch = 0;
    }
  }

  // Retry failed users (up to 3 passes)
  const maxRetries = 3;
  let retryPass = 1;

  while (failedUsers.length > 0 && retryPass <= maxRetries) {
    console.log(
      `\n🔄 Retry pass ${retryPass}/${maxRetries}: ${failedUsers.length} users remaining...\n`
    );

    const usersToRetry = [...failedUsers];
    failedUsers = [];

    // Reset batch tracking for retry pass
    const retryBatchSize = Math.max(1, Math.min(25, Math.floor(usersToRetry.length / 10)));
    let retryProcessedInBatch = 0;

    for (let i = 0; i < usersToRetry.length; i++) {
      const userId = usersToRetry[i];
      try {
        await updateUserCounts(userId, followDAO, client);
        updated++;
        totalErrors--; // Decrement error count on successful retry
        retryProcessedInBatch++;

        // Increased rate limiting for retries: 1000ms
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ Retry failed for ${userId}:`, error);
        failedUsers.push(userId); // Still failing, add back to list
        retryProcessedInBatch++;

        // More aggressive throttling on retry
        if (
          (error as any).name === "ProvisionedThroughputExceededException"
        ) {
          console.log("⏸️  Throttled - waiting 10 seconds...");
          await new Promise((resolve) => setTimeout(resolve, 10000));
        }
      }

      // Visual progress break for retry pass
      if (retryProcessedInBatch >= retryBatchSize || i === usersToRetry.length - 1) {
        const processed = i + 1;
        const progressPercent = ((processed / usersToRetry.length) * 100).toFixed(1);
        console.log("\n" + "─".repeat(60));
        console.log(
          `🔄 Retry ${retryPass} Progress: ${processed}/${usersToRetry.length} (${progressPercent}%) | ` +
          `Recovered: ${processed - failedUsers.length}`
        );
        console.log("─".repeat(60) + "\n");
        retryProcessedInBatch = 0;
      }
    }

    retryPass++;
  }

  // Summary report
  console.log("\n" + "=".repeat(60));
  console.log("📊 Summary:");
  console.log(`   Updated:    ${updated}`);
  console.log(`   Errors:     ${totalErrors}`);
  console.log(`   Total:      ${userIds.length}`);
  if (totalErrors === 0) {
    console.log(`   Success:    100%`);
  } else {
    const successRate = ((updated / userIds.length) * 100).toFixed(2);
    console.log(`   Success:    ${successRate}%`);
  }
  console.log("=".repeat(60));

  if (failedUsers.length > 0) {
    console.log("\n⚠️  Unrecoverable failures after retries:");
    failedUsers.forEach((userId) => console.log(`   - ${userId}`));
    console.log(
      "\n💡 Suggestions:"
    );
    console.log("   1. Re-run this script to retry failed users");
    console.log("   2. Run 'npm run reconcile-user-counts' to verify and fix");
    console.log("   3. Check DynamoDB provisioned throughput settings");
  }
}

backfillUserCounts()
  .then(() => {
    console.log("\n✅ Script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });
