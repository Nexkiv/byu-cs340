import { UserDAOFactory } from "../../src/dao/factory/UserDAOFactory";
import { UserDAO } from "../../src/dao/interface/UserDAO";
import { UserDto, FakeData } from "tweeter-shared";

const TEST_PASSWORD = "password123";

// Get first 20 users from FakeData
const fakeUsers = FakeData.instance.fakeUsers.slice(0, 20);
const testUsers = fakeUsers.map((user) => user.dto);

async function countUsersInDatabase(userDAO: UserDAO, testUsers: UserDto[]): Promise<number> {
  let count = 0;
  for (const userDto of testUsers) {
    const user = await userDAO.getUserByAlias(userDto.alias);
    if (user) count++;
  }
  return count;
}

async function populateTestUsers() {
  console.log("🚀 Starting test user population...\n");

  const userDAO: UserDAO = UserDAOFactory.create("dynamo");

  // Get initial count
  console.log("📊 Checking existing users in database...");
  const initialCount = await countUsersInDatabase(userDAO, testUsers);
  console.log(`   Found ${initialCount} of ${testUsers.length} test users already in database\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const userDto of testUsers) {
    try {
      // Check if user already exists
      const existingUser = await userDAO.getUserByAlias(userDto.alias);

      if (existingUser) {
        console.log(`⏭️  Skipped: ${userDto.alias} already exists`);
        skipped++;
      } else {
        // Create new user
        await userDAO.createUser(userDto, TEST_PASSWORD);
        console.log(`✅ Created: ${userDto.alias} (${userDto.firstName} ${userDto.lastName})`);
        created++;
      }
    } catch (error) {
      console.error(`❌ Error creating ${userDto.alias}:`, error);
      errors++;
    }
  }

  // Get final count
  console.log("\n📊 Verifying final state...");
  const finalCount = await countUsersInDatabase(userDAO, testUsers);

  console.log("\n" + "=".repeat(50));
  console.log("📊 Summary:");
  console.log(`   Created: ${created}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors:  ${errors}`);
  console.log(`   Total:   ${testUsers.length}`);
  console.log("=".repeat(50));

  console.log("\n📈 Database Statistics:");
  console.log(`   Before: ${initialCount}/${testUsers.length} users`);
  console.log(`   After:  ${finalCount}/${testUsers.length} users`);
  console.log(`   Change: +${finalCount - initialCount} users`);
  console.log("=".repeat(50));

  if (created > 0) {
    console.log("\n✨ Test users populated successfully!");
    console.log("   Password for all users: 'password123'");
  }
}

// Run the script
populateTestUsers()
  .then(() => {
    console.log("\n✅ Script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });
