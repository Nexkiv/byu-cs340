import { UserDAOFactory } from "../../src/dao/factory/UserDAOFactory";
import { FollowDAOFactory } from "../../src/dao/factory/FollowDAOFactory";
import { UserDAO } from "../../src/dao/interface/UserDAO";
import { FollowDAO } from "../../src/dao/interface/FollowDAO";
import { UserDto } from "tweeter-shared";
import { v4 as uuidv4 } from "uuid";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  UpdateTableCommand,
  DescribeTableCommand,
} from "@aws-sdk/client-dynamodb";

// Configuration
const MAIN_USERNAME = "@daisy";
const BASE_FOLLOWER_ALIAS = "@donald";
const FOLLOWER_PASSWORD = "password";
const FOLLOWER_IMAGE_URL =
  "https://faculty.cs.byu.edu/~jwilkerson/cs340/tweeter/images/donald_duck.png";
const BASE_FOLLOWER_FIRST_NAME = "Donald";
const BASE_FOLLOWER_LAST_NAME = "Duck";

const NUM_USERS_TO_CREATE = 10000;
const NUM_FOLLOWS_TO_CREATE = NUM_USERS_TO_CREATE;
const PROGRESS_INTERVAL = 100; // Log progress every 100 items

// DynamoDB capacity configuration
const HIGH_WCU = 200; // High capacity for bulk operations
const NORMAL_WCU = 1; // Normal capacity (adjust to your default)

/**
 * Generates a list of UserDto objects with systematic naming
 * @param startIndex - Starting index (e.g., 1 for first batch)
 * @param count - Number of users to generate
 * @returns Array of UserDto objects
 */
function generateUsers(startIndex: number, count: number): UserDto[] {
  const users: UserDto[] = [];

  for (let i = startIndex; i < startIndex + count; i++) {
    const userDto: UserDto = {
      userId: uuidv4(),
      firstName: `${BASE_FOLLOWER_FIRST_NAME}_${i}`,
      lastName: `${BASE_FOLLOWER_LAST_NAME}_${i}`,
      alias: `${BASE_FOLLOWER_ALIAS}${i}`,
      imageUrl: FOLLOWER_IMAGE_URL,
      followerCount: 0,
      followeeCount: 0,
    };
    users.push(userDto);
  }

  return users;
}

/**
 * Updates DynamoDB table Read and Write Capacity Units
 */
async function updateTableCapacity(
  client: DynamoDBClient,
  tableName: string,
  rcu: number,
  wcu: number
): Promise<void> {
  const command = new UpdateTableCommand({
    TableName: tableName,
    ProvisionedThroughput: {
      ReadCapacityUnits: rcu,
      WriteCapacityUnits: wcu,
    },
  });

  await client.send(command);
  console.log(`   ✓ Updated ${tableName} table: RCU=${rcu}, WCU=${wcu}`);
}

/**
 * Updates DynamoDB GSI Read and Write Capacity Units
 */
async function updateGSICapacity(
  client: DynamoDBClient,
  tableName: string,
  indexName: string,
  rcu: number,
  wcu: number
): Promise<void> {
  const command = new UpdateTableCommand({
    TableName: tableName,
    GlobalSecondaryIndexUpdates: [
      {
        Update: {
          IndexName: indexName,
          ProvisionedThroughput: {
            ReadCapacityUnits: rcu,
            WriteCapacityUnits: wcu,
          },
        },
      },
    ],
  });

  await client.send(command);
  console.log(`   ✓ Updated ${tableName}.${indexName} GSI: RCU=${rcu}, WCU=${wcu}`);
}

/**
 * Waits for table to become ACTIVE after capacity update
 */
async function waitForTableActive(
  client: DynamoDBClient,
  tableName: string
): Promise<void> {
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes max

  while (attempts < maxAttempts) {
    const command = new DescribeTableCommand({ TableName: tableName });
    const response = await client.send(command);

    if (response.Table?.TableStatus === "ACTIVE") {
      // Check if all GSIs are also active
      const allGSIsActive =
        response.Table.GlobalSecondaryIndexes?.every(
          (gsi) => gsi.IndexStatus === "ACTIVE"
        ) ?? true;

      if (allGSIsActive) {
        return;
      }
    }

    attempts++;
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
  }

  throw new Error(`Table ${tableName} did not become ACTIVE within timeout`);
}

/**
 * Increases RCUs and WCUs for all tables and GSIs
 */
async function increaseCapacity(client: DynamoDBClient): Promise<void> {
  console.log("📊 Increasing DynamoDB Capacity Units (RCU + WCU)...");

  try {
    // Update user table
    await updateTableCapacity(client, "user", HIGH_WCU, HIGH_WCU);

    // Update user table GSI (CRITICAL: This was missing!)
    await updateGSICapacity(client, "user", "alias_index", HIGH_WCU, HIGH_WCU);

    await waitForTableActive(client, "user");

    // Update follow table
    await updateTableCapacity(client, "follow", HIGH_WCU, HIGH_WCU);

    // Update follow table GSIs
    await updateGSICapacity(client, "follow", "follower_index", HIGH_WCU, HIGH_WCU);
    await updateGSICapacity(client, "follow", "followee_index", HIGH_WCU, HIGH_WCU);

    // Wait for all updates to complete
    await waitForTableActive(client, "follow");

    console.log("   ✓ All capacity increases complete!\n");
  } catch (error) {
    console.error("   ❌ Error increasing capacity:", error);
    throw error;
  }
}

/**
 * Decreases RCUs and WCUs back to normal for all tables and GSIs
 */
async function decreaseCapacity(client: DynamoDBClient): Promise<void> {
  console.log("📊 Decreasing DynamoDB Capacity Units back to normal...");

  try {
    // Update user table
    await updateTableCapacity(client, "user", NORMAL_WCU, NORMAL_WCU);

    // Update user table GSI
    await updateGSICapacity(client, "user", "alias_index", NORMAL_WCU, NORMAL_WCU);

    await waitForTableActive(client, "user");

    // Update follow table
    await updateTableCapacity(client, "follow", NORMAL_WCU, NORMAL_WCU);

    // Update follow table GSIs
    await updateGSICapacity(client, "follow", "follower_index", NORMAL_WCU, NORMAL_WCU);
    await updateGSICapacity(client, "follow", "followee_index", NORMAL_WCU, NORMAL_WCU);

    // Wait for all updates to complete
    await waitForTableActive(client, "follow");

    console.log("   ✓ All capacity decreases complete!\n");
  } catch (error) {
    console.error("   ❌ Error decreasing capacity:", error);
    console.error(
      "   ⚠️  WARNING: You may need to manually decrease capacity in AWS Console!"
    );
    throw error;
  }
}

/**
 * Main function to populate large dataset
 */
async function populateLargeDataset() {
  console.log("\n" + "=".repeat(70));
  console.log("🚀 LARGE DATASET POPULATION");
  console.log("=".repeat(70));
  console.log(`   Target: ${NUM_USERS_TO_CREATE} users + ${NUM_FOLLOWS_TO_CREATE} follows`);
  console.log(`   Script will automatically manage DynamoDB capacity`);
  console.log("=".repeat(70) + "\n");

  const startTime = Date.now();

  // Initialize clients and DAOs
  const dynamoClient = new DynamoDBClient({ region: "us-east-1" });
  const userDAO: UserDAO = UserDAOFactory.create("dynamo");
  const followDAO: FollowDAO = FollowDAOFactory.create("dynamo");

  // Increase capacity before starting
  await increaseCapacity(dynamoClient);

  try {
    // ============================================================
    // STEP 1: Verify main user exists
    // ============================================================
    console.log("📊 Verifying main user exists...");
    const mainUser = await userDAO.getUserByAlias(MAIN_USERNAME);

    if (!mainUser) {
      console.error(
        `\n❌ Error: Main user ${MAIN_USERNAME} not found in database.`
      );
      console.error(
        "   Please create this user first or modify MAIN_USERNAME in the script."
      );
      console.error("   You can run: npm run populate-test-users");
      process.exit(1);
    }

    console.log(`   ✓ Found: ${MAIN_USERNAME} (userId: ${mainUser.userId})\n`);

  // ============================================================
  // STEP 2: Create users
  // ============================================================
  console.log("📊 Creating users...");
  console.log(`   Generating ${NUM_USERS_TO_CREATE} users...\n`);

  // Generate all users upfront
  const usersToCreate = generateUsers(1, NUM_USERS_TO_CREATE);

  let usersCreated = 0;
  let usersSkipped = 0;
  let usersErrors = 0;

  for (let i = 0; i < usersToCreate.length; i++) {
    const userDto = usersToCreate[i];

    try {
      // Check if user already exists (idempotency)
      const existingUser = await userDAO.getUserByAlias(userDto.alias);

      if (existingUser) {
        console.log(`⏭️  Skipped: ${userDto.alias} already exists`);
        usersSkipped++;
      } else {
        // Create new user
        await userDAO.createUser(userDto, FOLLOWER_PASSWORD);
        console.log(
          `✅ Created: ${userDto.alias} (${userDto.firstName} ${userDto.lastName})`
        );
        usersCreated++;
      }

      // Progress logging
      const totalProcessed = usersCreated + usersSkipped + usersErrors;
      if (totalProcessed % PROGRESS_INTERVAL === 0) {
        console.log(
          `   Progress: ${totalProcessed}/${NUM_USERS_TO_CREATE} users processed`
        );
      }
    } catch (error) {
      console.error(`❌ Error creating ${userDto.alias}:`, error);
      usersErrors++;
    }
  }

  console.log(
    `\n✓ User creation complete: ${usersCreated} created, ${usersSkipped} skipped, ${usersErrors} errors\n`
  );

  // ============================================================
  // STEP 3: Create follows
  // ============================================================
  console.log("📊 Creating follows...");
  console.log(`   Fetching user IDs for ${NUM_FOLLOWS_TO_CREATE} users...\n`);

  // Build list of follower user IDs by querying database
  const followerUserIds: string[] = [];
  const followerAliases: string[] = [];

  for (let i = 1; i <= NUM_USERS_TO_CREATE; i++) {
    const alias = `${BASE_FOLLOWER_ALIAS}${i}`;
    const user = await userDAO.getUserByAlias(alias);

    if (user) {
      followerUserIds.push(user.userId);
      followerAliases.push(alias);
    } else {
      console.log(
        `⚠️  Warning: User ${alias} not found in database (skipping follow)`
      );
    }
  }

  console.log(`   Found ${followerUserIds.length} users in database\n`);

  let followsCreated = 0;
  let followsSkipped = 0;
  let followsErrors = 0;

  for (let i = 0; i < followerUserIds.length; i++) {
    const followerUserId = followerUserIds[i];
    const followerAlias = followerAliases[i];

    try {
      // Check if follow already exists (idempotency)
      const isFollowing = await followDAO.isFollower(
        followerUserId,
        mainUser.userId
      );

      if (isFollowing) {
        console.log(
          `⏭️  Skipped: ${followerAlias} → ${MAIN_USERNAME} (already exists)`
        );
        followsSkipped++;
      } else {
        // Create new follow
        await followDAO.follow(followerUserId, mainUser.userId);
        console.log(`✅ Created: ${followerAlias} → ${MAIN_USERNAME}`);
        followsCreated++;
      }

      // Progress logging
      const totalProcessed = followsCreated + followsSkipped + followsErrors;
      if (totalProcessed % PROGRESS_INTERVAL === 0) {
        console.log(
          `   Progress: ${totalProcessed}/${followerUserIds.length} follows processed`
        );
      }
    } catch (error) {
      console.error(
        `❌ Error creating follow ${followerAlias} → ${MAIN_USERNAME}:`,
        error
      );
      followsErrors++;
    }
  }

    console.log(
      `\n✓ Follow creation complete: ${followsCreated} created, ${followsSkipped} skipped, ${followsErrors} errors\n`
    );

    // ============================================================
    // STEP 4: Display comprehensive statistics
    // ============================================================
    const endTime = Date.now();
    const executionTimeMs = endTime - startTime;
    const executionTimeMin = (executionTimeMs / 1000 / 60).toFixed(2);

    console.log("\n" + "=".repeat(70));
    console.log("📊 FINAL SUMMARY");
    console.log("=".repeat(70));
    console.log("\nUsers:");
    console.log(`   Created: ${usersCreated}`);
    console.log(`   Skipped: ${usersSkipped}`);
    console.log(`   Errors:  ${usersErrors}`);
    console.log(`   Total:   ${NUM_USERS_TO_CREATE}`);

    console.log("\nFollows:");
    console.log(`   Created: ${followsCreated}`);
    console.log(`   Skipped: ${followsSkipped}`);
    console.log(`   Errors:  ${followsErrors}`);
    console.log(`   Total:   ${followerUserIds.length}`);

    console.log("\nExecution:");
    console.log(`   Time: ${executionTimeMin} minutes (${executionTimeMs}ms)`);
    console.log("=".repeat(70));

    if (usersCreated > 0 || followsCreated > 0) {
      console.log("\n✨ Large dataset populated successfully!");
      console.log(`   All users use password: '${FOLLOWER_PASSWORD}'`);
    }
  } finally {
    // Always decrease capacity back to normal, even if there was an error
    await decreaseCapacity(dynamoClient);
  }
}

// Run the script
populateLargeDataset()
  .then(() => {
    console.log("✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed with error:", error);
    process.exit(1);
  });
