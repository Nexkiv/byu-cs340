/**
 * Lambda Helper Utilities
 *
 * Provides reusable helper functions to reduce code duplication across Lambda handlers.
 * Each function follows a specific response pattern used by API Gateway.
 */

import { UserDto, SessionTokenDto } from 'tweeter-shared';

/**
 * Base response structure with success flag and optional message
 */
interface BaseResponse {
  success: boolean;
  message: string | null;
}

/**
 * Builds a generic success response with custom payload
 * @param payload Additional fields to include in response
 * @returns Success response with payload
 */
export function buildSuccessResponse<T extends Record<string, any>>(payload: T): BaseResponse & T {
  return {
    success: true,
    message: null,
    ...payload,
  };
}

/**
 * Builds a void operation response (no return value)
 * Used by: LogoutLambda, PostStatusItemLambda
 * @returns Success response with no additional data
 */
export function buildVoidResponse(): BaseResponse {
  return {
    success: true,
    message: null,
  };
}

/**
 * Builds an authentication response (login/register)
 * Used by: LoginLambda, RegisterLambda
 * @param user User data transfer object
 * @param token Session token data transfer object
 * @returns Success response with user and token
 */
export function buildAuthResponse(user: UserDto, token: SessionTokenDto): BaseResponse & {
  user: UserDto;
  token: SessionTokenDto;
} {
  return {
    success: true,
    message: null,
    user,
    token,
  };
}

/**
 * Builds a paged response with items and hasMore flag
 * Used by: GetFolloweesLambda, GetFollowersLambda, GetStoryItemsLambda, GetFeedItemsLambda
 * @param items Array of items for current page
 * @param hasMore Whether more items exist beyond current page
 * @returns Success response with items and hasMore
 */
export function buildPagedResponse<T>(items: T[], hasMore: boolean): BaseResponse & {
  items: T[];
  hasMore: boolean;
} {
  return {
    success: true,
    message: null,
    items,
    hasMore,
  };
}

/**
 * Builds a count response for follower/followee counts
 * Used by: GetFollowerCountLambda, GetFolloweeCountLambda
 * @param count The count value
 * @param countType Type of count ('numFollowers' or 'numFollowees')
 * @returns Success response with count field
 */
export function buildCountResponse(
  count: number,
  countType: 'numFollowers'
): BaseResponse & { numFollowers: number };
export function buildCountResponse(
  count: number,
  countType: 'numFollowees'
): BaseResponse & { numFollowees: number };
export function buildCountResponse(
  count: number,
  countType: 'numFollowers' | 'numFollowees'
): BaseResponse & ({ numFollowers: number } | { numFollowees: number }) {
  if (countType === 'numFollowers') {
    return {
      success: true,
      message: null,
      numFollowers: count,
    };
  } else {
    return {
      success: true,
      message: null,
      numFollowees: count,
    };
  }
}

/**
 * Builds a follow action response with both follower and followee counts
 * Used by: FollowLambda, UnfollowLambda
 * @param followerCount Number of followers
 * @param followeeCount Number of followees
 * @returns Success response with both counts
 */
export function buildFollowActionResponse(
  followerCount: number,
  followeeCount: number
): BaseResponse & {
  followerCount: number;
  followeeCount: number;
} {
  return {
    success: true,
    message: null,
    followerCount,
    followeeCount,
  };
}
