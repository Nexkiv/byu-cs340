import { FollowDAOFactory } from "../../src/dao/factory/FollowDAOFactory";
import { UserDAOFactory } from "../../src/dao/factory/UserDAOFactory";
import { FollowDAO } from "../../src/dao/interface/FollowDAO";
import { UserDAO } from "../../src/dao/interface/UserDAO";
import { FakeData } from "tweeter-shared";

async function populateTestFollowHistory() {
  console.log("🕒 Starting follow history population (soft-delete testing)...\n");

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

  // Define follow history relationships (will follow then unfollow)
  const historyRelationships: [string, string][] = [
    ["@igor", "@henry"],
    ["@isabel", "@helen"],
    ["@frank", "@gary"],
  ];

  let historyCreated = 0;
  let skipped = 0;
  let errors = 0;

  console.log("Creating follow history (follow + unfollow)...\n");

  for (const [followerAlias, followeeAlias] of historyRelationships) {
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

      // Check if already has history
      const history = await followDAO.getFollowHistory(
        followerUserId,
        followeeUserId
      );

      // != checks for both null and undefined (attribute may not exist in DynamoDB)
      if (history.length > 0 && history[0].unfollowTime != null) {
        console.log(
          `⏭️  Skipped: ${followerAlias} → ${followeeAlias} (history already exists)`
        );
        skipped++;
        continue;
      }

      // Create follow
      const followDto = await followDAO.follow(followerUserId, followeeUserId);
      console.log(`✅ Created follow: ${followerAlias} → ${followeeAlias}`);
      console.log(`   Waiting for GSI propagation before unfollowing...`);

      // Wait for GSI to update (eventual consistency) and ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Unfollow
      await followDAO.unfollow(followerUserId, followeeUserId);
      console.log(`❌ Unfollowed: ${followerAlias} ✗ ${followeeAlias}`);
      console.log(
        `   Follow history created (followTime: ${followDto.followTime})\n`
      );
      historyCreated++;
    } catch (error) {
      console.error(
        `❌ Error creating history ${followerAlias} → ${followeeAlias}:`,
        error
      );
      errors++;
    }
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 Summary:");
  console.log(`   Follow history created: ${historyCreated}`);
  console.log(`   Skipped (already exist): ${skipped}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Total relationships: ${historyRelationships.length}`);
  console.log("=".repeat(60));

  if (historyCreated > 0) {
    console.log("\n✨ Follow history populated successfully!");
  }
}

// Run the script
populateTestFollowHistory()
  .then(() => {
    console.log("\n✅ Script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });
