import { StatusDAOFactory } from "../../src/dao/factory/StatusDAOFactory";
import { StatusDAO } from "../../src/dao/interface/StatusDAO";
import { UserDAOFactory } from "../../src/dao/factory/UserDAOFactory";
import { UserDAO } from "../../src/dao/interface/UserDAO";
import { StatusDto, FakeData } from "tweeter-shared";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

// Get first 20 users from FakeData (matching populateTestUsers pattern)
const fakeUsers = FakeData.instance.fakeUsers.slice(0, 20);
const fakeStatuses = FakeData.instance.fakeStatuses;

// Filter statuses for the first 20 users (40 statuses total: 2 per user)
const testStatuses = fakeStatuses.filter((status) => {
  const userIds = fakeUsers.map((u) => u.userId);
  return userIds.includes(status.userId);
});

async function verifyUsersExist(userDAO: UserDAO): Promise<boolean> {
  console.log("🔍 Verifying prerequisite: test users exist...");
  let missingUsers = 0;

  for (const user of fakeUsers) {
    const existingUser = await userDAO.getUserByAlias(user.alias);
    if (!existingUser) {
      console.error(`   ❌ Missing user: ${user.alias}`);
      missingUsers++;
    }
  }

  if (missingUsers > 0) {
    console.error(`\n❌ ERROR: ${missingUsers} test users are missing!`);
    console.error("   Please run 'npm run populate-test-users' first.\n");
    return false;
  }

  console.log(`   ✅ All ${fakeUsers.length} test users verified in database\n`);
  return true;
}

async function countStatusesInDatabase(
  client: DynamoDBDocumentClient,
  testStatuses: StatusDto[]
): Promise<number> {
  let count = 0;
  for (const statusDto of testStatuses) {
    const result = await client.send(
      new GetCommand({
        TableName: "status",
        Key: {
          statusId: statusDto.statusId,
          postTime: statusDto.postTime,
        },
      })
    );
    if (result.Item) count++;
  }
  return count;
}

async function populateTestStatuses() {
  console.log("🚀 Starting test status population...\n");

  const statusDAO: StatusDAO = StatusDAOFactory.create("dynamo");
  const userDAO: UserDAO = UserDAOFactory.create("dynamo");
  const client = DynamoDBDocumentClient.from(new DynamoDBClient());

  // Verify users exist first
  const usersExist = await verifyUsersExist(userDAO);
  if (!usersExist) {
    throw new Error("Cannot proceed without test users");
  }

  // Update post times on domain objects to start from now
  // Start from current time and go backwards (1 minute intervals)
  const currentTime = Date.now();
  const ONE_MINUTE = 60 * 1000;

  testStatuses.forEach((status, index) => {
    // Newest posts first: current time minus index minutes
    status.postTime = currentTime - (index * ONE_MINUTE);
  });

  console.log(`📅 Post times: ${new Date(testStatuses[0].postTime).toISOString()} (newest) to ${new Date(testStatuses[testStatuses.length - 1].postTime).toISOString()} (oldest)\n`);

  // Convert to DTOs after updating timestamps
  const testStatusDtos = testStatuses.map((status) => status.dto);

  // Get initial count
  console.log("📊 Checking existing statuses in database...");
  const initialCount = await countStatusesInDatabase(client, testStatusDtos);
  console.log(`   Found ${initialCount} of ${testStatusDtos.length} test statuses already in database\n`);

  console.log("Creating statuses for test users...");
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const status of testStatuses) {
    try {
      const statusDto = status.dto;

      // Check if status already exists
      const result = await client.send(
        new GetCommand({
          TableName: "status",
          Key: {
            statusId: statusDto.statusId,
            postTime: statusDto.postTime,
          },
        })
      );

      if (result.Item) {
        console.log(`⏭️  Skipped: ${statusDto.statusId} already exists`);
        skipped++;
      } else {
        // Create new status
        await statusDAO.postStatus(statusDto);
        const author = fakeUsers.find((u) => u.userId === statusDto.userId);
        const preview = statusDto.contents.substring(0, 30).replace(/\n/g, " ");
        console.log(`✅ Created: ${statusDto.statusId} by ${author?.alias || "unknown"} - "${preview}..."`);
        created++;
      }
    } catch (error) {
      console.error(`❌ Error creating status ${status.statusId}:`, error);
      errors++;
    }
  }

  // Get final count
  console.log("\n📊 Verifying final state...");
  const finalCount = await countStatusesInDatabase(client, testStatusDtos);

  console.log("\n" + "=".repeat(50));
  console.log("📊 Summary:");
  console.log(`   Created: ${created}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors:  ${errors}`);
  console.log(`   Total:   ${testStatusDtos.length}`);
  console.log("=".repeat(50));

  console.log("\n📈 Database Statistics:");
  console.log(`   Before: ${initialCount}/${testStatusDtos.length} statuses`);
  console.log(`   After:  ${finalCount}/${testStatusDtos.length} statuses`);
  console.log(`   Change: +${finalCount - initialCount} statuses`);
  console.log("=".repeat(50));

  if (created > 0) {
    console.log("\n✨ Test statuses populated successfully!");
    console.log(`   ${created} new statuses created across ${fakeUsers.length} test users`);
  }
}

// Run the script
populateTestStatuses()
  .then(() => {
    console.log("\n✅ Script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });
