import { FollowDAOFactory } from "../../src/dao/factory/FollowDAOFactory";
import { UserDAOFactory } from "../../src/dao/factory/UserDAOFactory";
import { FollowDAO } from "../../src/dao/interface/FollowDAO";
import { UserDAO } from "../../src/dao/interface/UserDAO";
import { FakeData } from "tweeter-shared";
import {
  ScanCommand,
  ScanCommandInput,
  DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

// Helper function to count all active follows in database
async function countActiveFollowsInDatabase(
  followDAO: FollowDAO,
  userMap: Map<string, string>
): Promise<number> {
  let totalCount = 0;

  for (const userId of userMap.values()) {
    const followeeCount = await followDAO.getFolloweeCount(userId);
    totalCount += followeeCount;
  }

  return totalCount;
}

async function populateTestFollows() {
  console.log("🚀 Starting follow relationships population...\n");

  const userDAO: UserDAO = UserDAOFactory.create("dynamo");
  const followDAO: FollowDAO = FollowDAOFactory.create("dynamo");

  // Get first 20 test users
  const fakeUsers = FakeData.instance.fakeUsers.slice(0, 20);
  const testUsers = fakeUsers.map((user) => user.dto);

  console.log("📊 Loading users from database...");

  // Build map of alias -> userId from database
  const userMap = new Map<string, string>();
  let usersFound = 0;

  for (const userDto of testUsers) {
    const dbUser = await userDAO.getUserByAlias(userDto.alias);
    if (dbUser) {
      userMap.set(userDto.alias, dbUser.userId);
      usersFound++;
    }
  }

  console.log(`   Found ${usersFound}/${testUsers.length} users in database\n`);

  if (usersFound < 20) {
    console.error("❌ Error: Not all 20 test users found in database.");
    console.error("   Please run 'npm run populate-test-users' first.");
    process.exit(1);
  }

  // Get initial count of follows
  console.log("📊 Checking existing follows in database...");
  const initialFollowCount = await countActiveFollowsInDatabase(
    followDAO,
    userMap
  );
  console.log(`   Found ${initialFollowCount} active follow relationships\n`);

  // Define follow relationships to create
  // Format: [followerAlias, followeeAlias]
  const followRelationships: [string, string][] = [
    // Pattern 1: Popular users (@allen, @bob, @chris have many followers)
    ["@amy", "@allen"],
    ["@bonnie", "@allen"],
    ["@cindy", "@allen"],
    ["@dan", "@allen"],
    ["@dee", "@allen"],

    ["@elliott", "@bob"],
    ["@elizabeth", "@bob"],
    ["@frank", "@bob"],
    ["@fran", "@bob"],
    ["@gary", "@bob"],

    ["@giovanna", "@chris"],
    ["@henry", "@chris"],
    ["@helen", "@chris"],
    ["@igor", "@chris"],
    ["@isabel", "@chris"],

    // Pattern 2: Social users (@amy, @bonnie, @cindy follow many)
    ["@amy", "@bob"],
    ["@amy", "@bonnie"],
    ["@amy", "@chris"],
    ["@amy", "@cindy"],
    ["@amy", "@dan"],

    ["@bonnie", "@dee"],
    ["@bonnie", "@elliott"],
    ["@bonnie", "@elizabeth"],
    ["@bonnie", "@frank"],
    ["@bonnie", "@fran"],

    ["@cindy", "@gary"],
    ["@cindy", "@giovanna"],
    ["@cindy", "@henry"],
    ["@cindy", "@helen"],
    ["@cindy", "@igor"],

    // Pattern 3: Mutual follows
    ["@dan", "@dee"],
    ["@dee", "@dan"],

    ["@elliott", "@elizabeth"],
    ["@elizabeth", "@elliott"],

    ["@frank", "@fran"],
    ["@fran", "@frank"],

    ["@gary", "@giovanna"],
    ["@giovanna", "@gary"],

    ["@henry", "@helen"],
    ["@helen", "@henry"],

    ["@igor", "@isabel"],
    ["@isabel", "@igor"],

    ["@justin", "@jill"],
    ["@jill", "@justin"],
  ];

  let created = 0;
  let skipped = 0;
  let errors = 0;

  console.log("Creating active follow relationships...\n");

  for (const [followerAlias, followeeAlias] of followRelationships) {
    try {
      const followerUserId = userMap.get(followerAlias);
      const followeeUserId = userMap.get(followeeAlias);

      if (!followerUserId || !followeeUserId) {
        console.error(
          `❌ Error: User not found (${followerAlias} or ${followeeAlias})`
        );
        errors++;
        continue;
      }

      // Check if already exists (for idempotency)
      const exists = await followDAO.isFollower(followerUserId, followeeUserId);

      if (exists) {
        console.log(
          `⏭️  Skipped: ${followerAlias} → ${followeeAlias} (already exists)`
        );
        skipped++;
      } else {
        await followDAO.follow(followerUserId, followeeUserId);
        console.log(`✅ Created: ${followerAlias} → ${followeeAlias}`);
        created++;
      }
    } catch (error) {
      console.error(
        `❌ Error creating ${followerAlias} → ${followeeAlias}:`,
        error
      );
      errors++;
    }
  }

  console.log("\n💡 Note: Run 'npm run populate-test-follow-history' separately");
  console.log("   to test unfollow functionality with natural time delays.");

  // Get final count of follows
  console.log("\n📊 Verifying final state...");
  const finalFollowCount = await countActiveFollowsInDatabase(
    followDAO,
    userMap
  );

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 Summary:");
  console.log(`   Active follows created: ${created}`);
  console.log(`   Skipped (already exist): ${skipped}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Total relationships: ${followRelationships.length}`);
  console.log("=".repeat(60));

  console.log("\n📈 Database Statistics:");
  console.log(`   Before: ${initialFollowCount} active follows`);
  console.log(`   After:  ${finalFollowCount} active follows`);
  console.log(`   Change: +${finalFollowCount - initialFollowCount} follows`);
  console.log("=".repeat(60));

  if (created > 0) {
    console.log("\n✨ Follow relationships populated successfully!");
  }
}

// Run the script
populateTestFollows()
  .then(() => {
    console.log("\n✅ Script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });
