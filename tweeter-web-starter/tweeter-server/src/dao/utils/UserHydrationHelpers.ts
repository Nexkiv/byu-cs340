import {
  BatchGetCommand,
  DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";
import { UserDto } from "tweeter-shared";

/**
 * Utility functions for user data hydration patterns.
 *
 * Design: Domain-specific helpers for Follow DAO patterns
 * - Batch fetches users from DynamoDB
 * - Combines follow metadata with user data
 * - Generic hydration function for followees and followers
 *
 * Eliminates ~50 lines of nearly identical code across 2 FollowDAO methods.
 */

/**
 * Batch fetches users from DynamoDB and returns as a Map for efficient lookup.
 * Handles empty userIds array gracefully.
 *
 * Pattern Used In:
 * - FollowDAO.getPageOfFollowees (fetch followee users)
 * - FollowDAO.getPageOfFollowers (fetch follower users)
 *
 * Returns Map instead of array for O(1) lookup when combining with follow data.
 *
 * @param client - DynamoDB DocumentClient
 * @param userTable - User table name (typically "user")
 * @param userIds - Array of user IDs to fetch (can be empty)
 * @returns Map of userId -> UserDto for efficient lookup
 *
 * @example
 * ```typescript
 * const followerUserIds = followItems.map(item => item.followerUserId);
 * const userMap = await batchGetUsers(this.client, "user", followerUserIds);
 *
 * // O(1) lookup for each follow item
 * const user = userMap.get(followItem.followerUserId);
 * ```
 */
export async function batchGetUsers(
  client: DynamoDBDocumentClient,
  userTable: string,
  userIds: string[]
): Promise<Map<string, UserDto>> {
  // Handle empty array case (no users to fetch)
  if (userIds.length === 0) {
    return new Map();
  }

  const userMap = new Map<string, UserDto>();
  const BATCH_SIZE = 100; // DynamoDB BatchGetItem max items per request

  // Chunk userIds into batches of 100
  const chunks: string[][] = [];
  for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
    chunks.push(userIds.slice(i, i + BATCH_SIZE));
  }

  // Fetch all chunks in parallel for better performance
  const batchResults = await Promise.all(
    chunks.map((chunk) =>
      client.send(
        new BatchGetCommand({
          RequestItems: {
            [userTable]: {
              Keys: chunk.map((userId) => ({ userId })),
            },
          },
        })
      )
    )
  );

  // Add all results to map
  batchResults.forEach((batchResult) => {
    const users = (batchResult.Responses?.[userTable] || []) as UserDto[];
    users.forEach((user) => userMap.set(user.userId, user));
  });

  return userMap;
}

/**
 * Hydrates follow items with user data.
 * Generic pattern for combining follow metadata with user profile data.
 *
 * Pattern Used In:
 * - FollowDAO.getPageOfFollowees (combine followee users with follow metadata)
 * - FollowDAO.getPageOfFollowers (combine follower users with follow metadata)
 *
 * Design: Generic function that works for both followees and followers by accepting
 * extractor functions to pull the appropriate userId and followTime from follow items.
 *
 * @param followItems - Raw follow items from DynamoDB query
 * @param userMap - Pre-fetched user data (from batchGetUsers)
 * @param extractUserId - Function to extract userId from follow item (followeeUserId or followerUserId)
 * @param extractFollowTime - Function to extract followTime from follow item
 * @returns Array of hydrated follow objects with user and followTime
 *
 * @example
 * ```typescript
 * // For followees (users that current user follows)
 * const userFollows = hydrateFollowsWithUsers(
 *   followItems,
 *   userMap,
 *   (item) => item.followeeUserId,  // Extract followee's userId
 *   (item) => item.followTime
 * );
 *
 * // For followers (users that follow current user)
 * const userFollows = hydrateFollowsWithUsers(
 *   followItems,
 *   userMap,
 *   (item) => item.followerUserId,  // Extract follower's userId
 *   (item) => item.followTime
 * );
 * ```
 */
export function hydrateFollowsWithUsers<TFollowItem>(
  followItems: TFollowItem[],
  userMap: Map<string, UserDto>,
  extractUserId: (item: TFollowItem) => string,
  extractFollowTime: (item: TFollowItem) => number,
  extractFollowId: (item: TFollowItem) => string
): Array<{ user: UserDto; followTime: number; followId: string }> {
  const result: Array<{ user: UserDto; followTime: number; followId: string }> = [];

  // Combine follow metadata with user data
  followItems.forEach((followItem) => {
    const userId = extractUserId(followItem);
    const user = userMap.get(userId);

    // Only include if user was found (defensive: handle deleted users)
    if (user) {
      result.push({
        user,
        followTime: extractFollowTime(followItem),
        followId: extractFollowId(followItem),
      });
    }
  });

  return result;
}
