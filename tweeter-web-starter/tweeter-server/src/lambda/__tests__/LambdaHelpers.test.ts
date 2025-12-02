/**
 * Unit tests for Lambda helper utilities
 */

import {
  buildSuccessResponse,
  buildVoidResponse,
  buildAuthResponse,
  buildPagedResponse,
  buildCountResponse,
  buildFollowActionResponse,
} from '../LambdaHelpers';
import { UserDto, SessionTokenDto } from 'tweeter-shared';

describe('LambdaHelpers', () => {
  describe('buildSuccessResponse', () => {
    it('should build success response with custom payload', () => {
      const payload = { data: 'test', count: 42 };
      const response = buildSuccessResponse(payload);

      expect(response).toEqual({
        success: true,
        message: null,
        data: 'test',
        count: 42,
      });
    });

    it('should build success response with single field', () => {
      const response = buildSuccessResponse({ user: { id: '123' } });

      expect(response).toEqual({
        success: true,
        message: null,
        user: { id: '123' },
      });
    });

    it('should build success response with empty payload', () => {
      const response = buildSuccessResponse({});

      expect(response).toEqual({
        success: true,
        message: null,
      });
    });
  });

  describe('buildVoidResponse', () => {
    it('should build void response with success and null message', () => {
      const response = buildVoidResponse();

      expect(response).toEqual({
        success: true,
        message: null,
      });
    });

    it('should have only success and message fields', () => {
      const response = buildVoidResponse();
      const keys = Object.keys(response);

      expect(keys).toHaveLength(2);
      expect(keys).toContain('success');
      expect(keys).toContain('message');
    });
  });

  describe('buildAuthResponse', () => {
    it('should build auth response with user and token', () => {
      const mockUser: UserDto = {
        userId: '123',
        firstName: 'John',
        lastName: 'Doe',
        alias: '@john',
        imageUrl: 'http://example.com/john.jpg',
      };

      const mockToken: SessionTokenDto = {
        tokenId: 'token123',
        userId: '123',
        expirationTime: Date.now() + 86400000,
      };

      const response = buildAuthResponse(mockUser, mockToken);

      expect(response).toEqual({
        success: true,
        message: null,
        user: mockUser,
        token: mockToken,
      });
    });

    it('should preserve all user fields', () => {
      const mockUser: UserDto = {
        userId: 'user-456',
        firstName: 'Jane',
        lastName: 'Smith',
        alias: '@jane',
        imageUrl: 'http://example.com/jane.jpg',
      };

      const mockToken: SessionTokenDto = {
        tokenId: 'token456',
        userId: 'user-456',
        expirationTime: 1234567890,
      };

      const response = buildAuthResponse(mockUser, mockToken);

      expect(response.user.userId).toBe('user-456');
      expect(response.user.firstName).toBe('Jane');
      expect(response.user.lastName).toBe('Smith');
      expect(response.user.alias).toBe('@jane');
      expect(response.token.tokenId).toBe('token456');
    });
  });

  describe('buildPagedResponse', () => {
    it('should build paged response with items and hasMore true', () => {
      const items = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
      ];

      const response = buildPagedResponse(items, true);

      expect(response).toEqual({
        success: true,
        message: null,
        items: items,
        hasMore: true,
      });
    });

    it('should build paged response with items and hasMore false', () => {
      const items = [{ id: '1', name: 'Item 1' }];

      const response = buildPagedResponse(items, false);

      expect(response).toEqual({
        success: true,
        message: null,
        items: items,
        hasMore: false,
      });
    });

    it('should build paged response with empty items array', () => {
      const response = buildPagedResponse([], false);

      expect(response).toEqual({
        success: true,
        message: null,
        items: [],
        hasMore: false,
      });
    });

    it('should preserve item types (UserDto)', () => {
      const users: UserDto[] = [
        {
          userId: '1',
          firstName: 'Alice',
          lastName: 'Smith',
          alias: '@alice',
          imageUrl: 'http://example.com/alice.jpg',
        },
      ];

      const response = buildPagedResponse(users, true);

      expect(response.items).toHaveLength(1);
      expect(response.items[0].alias).toBe('@alice');
    });
  });

  describe('buildCountResponse', () => {
    it('should build follower count response', () => {
      const response = buildCountResponse(42, 'numFollowers');

      expect(response).toEqual({
        success: true,
        message: null,
        numFollowers: 42,
      });
    });

    it('should build followee count response', () => {
      const response = buildCountResponse(17, 'numFollowees');

      expect(response).toEqual({
        success: true,
        message: null,
        numFollowees: 17,
      });
    });

    it('should handle zero count', () => {
      const response = buildCountResponse(0, 'numFollowers');

      expect(response).toEqual({
        success: true,
        message: null,
        numFollowers: 0,
      });
    });

    it('should only include the specified count field', () => {
      const followerResponse = buildCountResponse(10, 'numFollowers');
      const followeeResponse = buildCountResponse(20, 'numFollowees');

      expect(followerResponse.numFollowers).toBe(10);
      expect('numFollowees' in followerResponse).toBe(false);

      expect(followeeResponse.numFollowees).toBe(20);
      expect('numFollowers' in followeeResponse).toBe(false);
    });
  });

  describe('buildFollowActionResponse', () => {
    it('should build follow action response with both counts', () => {
      const response = buildFollowActionResponse(100, 50);

      expect(response).toEqual({
        success: true,
        message: null,
        followerCount: 100,
        followeeCount: 50,
      });
    });

    it('should handle zero counts', () => {
      const response = buildFollowActionResponse(0, 0);

      expect(response).toEqual({
        success: true,
        message: null,
        followerCount: 0,
        followeeCount: 0,
      });
    });

    it('should handle different count values', () => {
      const response = buildFollowActionResponse(999, 1);

      expect(response.followerCount).toBe(999);
      expect(response.followeeCount).toBe(1);
    });
  });
});
