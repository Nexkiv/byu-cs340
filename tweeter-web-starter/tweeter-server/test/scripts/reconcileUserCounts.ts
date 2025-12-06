import { UserDAOFactory } from "../../src/dao/factory/UserDAOFactory";
import { FollowDAOFactory } from "../../src/dao/factory/FollowDAOFactory";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  ScanCommandOutput,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

interface CountMismatch {
  userId: string;
  cachedFollowerCount: number;
  actualFollowerCount: number;
  cachedFolloweeCount: number;
  actualFolloweeCount: number;
}

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

async function reconcileUserCounts() {
  console.log("🔍 Starting user count reconciliation...\n");

  const userDAO = UserDAOFactory.create("dynamo");
  const followDAO = FollowDAOFactory.create("dynamo");
  const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

  const userIds = await getAllUsers();
  let checked = 0;
  let mismatches = 0;
  let fixed = 0;
  let errors = 0;
  const mismatchDetails: CountMismatch[] = [];

  for (const userId of userIds) {
    try {
      // Read cached counts from user table
      const user = await userDAO.getUserById(userId);
      if (!user) {
        console.warn(`⚠️  User not found: ${userId}`);
        errors++;
        continue;
      }

      const cachedFollowerCount = user.followerCount;
      const cachedFolloweeCount = user.followeeCount;

      // Compute actual counts from follow table
      const actualFollowerCount = await followDAO.getFollowerCount(userId);
      const actualFolloweeCount = await followDAO.getFolloweeCount(userId);

      checked++;

      // Check for mismatches
      if (
        cachedFollowerCount !== actualFollowerCount ||
        cachedFolloweeCount !== actualFolloweeCount
      ) {
        mismatches++;
        mismatchDetails.push({
          userId,
          cachedFollowerCount,
          actualFollowerCount,
          cachedFolloweeCount,
          actualFolloweeCount,
        });

        console.log(`⚠️  Mismatch detected for ${userId}:`);
        console.log(
          `   Followers: cached=${cachedFollowerCount}, actual=${actualFollowerCount}`
        );
        console.log(
          `   Followees: cached=${cachedFolloweeCount}, actual=${actualFolloweeCount}`
        );

        // Fix the mismatch
        await client.send(
          new UpdateCommand({
            TableName: "user",
            Key: { userId },
            UpdateExpression:
              "SET followerCount = :fc, followeeCount = :fec",
            ExpressionAttributeValues: {
              ":fc": actualFollowerCount,
              ":fec": actualFolloweeCount,
            },
          })
        );

        console.log(`   ✅ Fixed counts for ${userId}`);
        fixed++;
      }

      // Rate limiting: 500ms between users
      if (checked < userIds.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`❌ Error processing ${userId}:`, error);
      errors++;

      // Adaptive throttling
      if ((error as any).name === "ProvisionedThroughputExceededException") {
        console.log("⏸️  Throttled - waiting 5 seconds...");
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  // Summary report
  console.log("\n" + "=".repeat(60));
  console.log("📊 Reconciliation Summary:");
  console.log(`   Checked:    ${checked}`);
  console.log(`   Mismatches: ${mismatches}`);
  console.log(`   Fixed:      ${fixed}`);
  console.log(`   Errors:     ${errors}`);
  console.log(`   Total:      ${userIds.length}`);

  if (mismatches > 0) {
    const driftPercentage = ((mismatches / checked) * 100).toFixed(2);
    console.log(`   Drift Rate: ${driftPercentage}%`);
  }

  console.log("=".repeat(60));

  if (mismatchDetails.length > 0) {
    console.log("\n📋 Detailed Mismatch Report:");
    for (const mismatch of mismatchDetails) {
      console.log(`\n   User: ${mismatch.userId}`);
      console.log(
        `     Followers: ${mismatch.cachedFollowerCount} → ${mismatch.actualFollowerCount}`
      );
      console.log(
        `     Followees: ${mismatch.cachedFolloweeCount} → ${mismatch.actualFolloweeCount}`
      );
    }
  }
}

reconcileUserCounts()
  .then(() => {
    console.log("\n✅ Reconciliation completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Reconciliation failed:", error);
    process.exit(1);
  });
