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

  // Batch fetch all users in one request
  const batchResult = await client.send(
    new BatchGetCommand({
      RequestItems: {
        [userTable]: {
          Keys: userIds.map((userId) => ({ userId })),
        },
      },
    })
  );

  // Convert array to Map for O(1) lookup
  const users = (batchResult.Responses?.[userTable] || []) as UserDto[];
  const userMap = new Map<string, UserDto>();
  users.forEach((user) => userMap.set(user.userId, user));

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
  extractFollowTime: (item: TFollowItem) => number
): Array<{ user: UserDto; followTime: number }> {
  const result: Array<{ user: UserDto; followTime: number }> = [];

  // Combine follow metadata with user data
  followItems.forEach((followItem) => {
    const userId = extractUserId(followItem);
    const user = userMap.get(userId);

    // Only include if user was found (defensive: handle deleted users)
    if (user) {
      result.push({
        user,
        followTime: extractFollowTime(followItem),
      });
    }
  });

  return result;
}
