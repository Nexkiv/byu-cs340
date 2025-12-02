/**
 * Unit tests for ServerFacade helper methods.
 * These tests directly test the private helper methods using type assertions.
 */

import { ServerFacade } from '../../src/net/ServerFacade';
import { User, SessionToken, UserDto, Status, StatusDto } from 'tweeter-shared';

describe('ServerFacade Helper Methods', () => {
  let serverFacade: any; // Type as any to access private methods
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    serverFacade = new ServerFacade();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('handleVoidResponse', () => {
    it('should not throw error for successful response', () => {
      const response = { success: true, message: null };

      expect(() => serverFacade.handleVoidResponse(response)).not.toThrow();
    });

    it('should throw error for failed response', () => {
      const response = { success: false, message: 'Operation failed' };

      expect(() => serverFacade.handleVoidResponse(response)).toThrow('Operation failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith(response);
    });

    it('should throw error with undefined message when message is null', () => {
      const response = { success: false, message: null };

      expect(() => serverFacade.handleVoidResponse(response)).toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(response);
    });
  });

  describe('handleSimpleValueResponse', () => {
    it('should extract value from successful response', () => {
      const response = {
        success: true,
        message: null,
        isFollower: true,
      };

      const result = serverFacade.handleSimpleValueResponse(
        response,
        (r: any) => r.isFollower
      );

      expect(result).toBe(true);
    });

    it('should extract numeric value from successful response', () => {
      const response = {
        success: true,
        message: null,
        numFollowers: 42,
      };

      const result = serverFacade.handleSimpleValueResponse(
        response,
        (r: any) => r.numFollowers
      );

      expect(result).toBe(42);
    });

    it('should throw error for failed response', () => {
      const response = {
        success: false,
        message: 'Database error',
        value: 0,
      };

      expect(() =>
        serverFacade.handleSimpleValueResponse(response, (r: any) => r.value)
      ).toThrow('Database error');
      expect(consoleErrorSpy).toHaveBeenCalledWith(response);
    });

    it('should allow extractor to transform the value', () => {
      const response = {
        success: true,
        message: null,
        count: 10,
      };

      const result = serverFacade.handleSimpleValueResponse(
        response,
        (r: any) => r.count * 2
      );

      expect(result).toBe(20);
    });
  });

  describe('handleFollowActionResponse', () => {
    it('should return tuple of counts for successful response', () => {
      const response = {
        success: true,
        message: null,
        followerCount: 100,
        followeeCount: 50,
      };

      const result = serverFacade.handleFollowActionResponse(response);

      expect(result).toEqual([100, 50]);
    });

    it('should throw error for failed response', () => {
      const response = {
        success: false,
        message: 'Cannot follow user',
        followerCount: 0,
        followeeCount: 0,
      };

      expect(() => serverFacade.handleFollowActionResponse(response)).toThrow(
        'Cannot follow user'
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(response);
    });

    it('should handle zero counts', () => {
      const response = {
        success: true,
        message: null,
        followerCount: 0,
        followeeCount: 0,
      };

      const result = serverFacade.handleFollowActionResponse(response);

      expect(result).toEqual([0, 0]);
    });
  });

  describe('handleAuthResponse', () => {
    it('should convert DTOs to domain models for successful response', () => {
      const response = {
        success: true,
        message: null,
        user: {
          userId: '123',
          firstName: 'John',
          lastName: 'Doe',
          alias: '@john',
          imageUrl: 'http://example.com/john.jpg',
        },
        token: {
          tokenId: 'token123',
          userId: '123',
          expirationTime: 1234567890,
        },
      };

      const [user, token] = serverFacade.handleAuthResponse(response);

      expect(user).toBeInstanceOf(User);
      expect(user?.alias).toBe('@john');
      expect(user?.firstName).toBe('John');
      expect(token).toBeInstanceOf(SessionToken);
      expect(token?.tokenId).toBe('token123');
    });

    it('should return nulls when DTOs are missing but success is true', () => {
      const response = {
        success: true,
        message: null,
      };

      const [user, token] = serverFacade.handleAuthResponse(response);

      expect(user).toBeNull();
      expect(token).toBeNull();
    });

    it('should throw error for failed response', () => {
      const response = {
        success: false,
        message: 'Invalid credentials',
        user: undefined,
        token: undefined,
      };

      expect(() => serverFacade.handleAuthResponse(response)).toThrow('Invalid credentials');
      expect(consoleErrorSpy).toHaveBeenCalledWith(response);
    });
  });

  describe('handleSingleObjectResponse', () => {
    it('should convert DTO to domain model for successful response', () => {
      const response = {
        success: true,
        message: null,
        user: {
          userId: '456',
          firstName: 'Jane',
          lastName: 'Smith',
          alias: '@jane',
          imageUrl: 'http://example.com/jane.jpg',
        },
      };

      const result = serverFacade.handleSingleObjectResponse(
        response,
        'user',
        (dto: UserDto) => User.fromDto(dto) as User,
        'No user found'
      );

      expect(result).toBeInstanceOf(User);
      expect(result.alias).toBe('@jane');
      expect(result.firstName).toBe('Jane');
    });

    it('should throw custom error when DTO is null but success is true', () => {
      const response = {
        success: true,
        message: null,
        user: null,
      };

      expect(() =>
        serverFacade.handleSingleObjectResponse(
          response,
          'user',
          (dto: UserDto) => User.fromDto(dto) as User,
          'User not found in database'
        )
      ).toThrow('User not found in database');
    });

    it('should throw error for failed response', () => {
      const response = {
        success: false,
        message: 'Server error',
        user: null,
      };

      expect(() =>
        serverFacade.handleSingleObjectResponse(
          response,
          'user',
          (dto: UserDto) => User.fromDto(dto) as User,
          'No user found'
        )
      ).toThrow('Server error');
      expect(consoleErrorSpy).toHaveBeenCalledWith(response);
    });

    it('should work with different DTO field names', () => {
      const response = {
        success: true,
        message: null,
        profile: {
          userId: '789',
          firstName: 'Bob',
          lastName: 'Wilson',
          alias: '@bob',
          imageUrl: 'http://example.com/bob.jpg',
        },
      };

      const result = serverFacade.handleSingleObjectResponse(
        response,
        'profile',
        (dto: UserDto) => User.fromDto(dto) as User,
        'No profile found'
      );

      expect(result).toBeInstanceOf(User);
      expect(result.alias).toBe('@bob');
    });
  });

  describe('handlePagedItemsResponse', () => {
    it('should convert DTO array to domain model array', () => {
      const response = {
        success: true,
        message: null,
        items: [
          {
            userId: '1',
            firstName: 'Alice',
            lastName: 'Johnson',
            alias: '@alice',
            imageUrl: 'http://example.com/alice.jpg',
          },
          {
            userId: '2',
            firstName: 'Bob',
            lastName: 'Smith',
            alias: '@bob',
            imageUrl: 'http://example.com/bob.jpg',
          },
        ],
        hasMore: true,
      };

      const [items, hasMore] = serverFacade.handlePagedItemsResponse(
        response,
        (dto: UserDto) => User.fromDto(dto) as User,
        'No items found'
      );

      expect(items).toHaveLength(2);
      expect(items[0]).toBeInstanceOf(User);
      expect(items[0].alias).toBe('@alice');
      expect(items[1]).toBeInstanceOf(User);
      expect(items[1].alias).toBe('@bob');
      expect(hasMore).toBe(true);
    });

    it('should handle empty array with hasMore false', () => {
      const response = {
        success: true,
        message: null,
        items: [],
        hasMore: false,
      };

      const [items, hasMore] = serverFacade.handlePagedItemsResponse(
        response,
        (dto: UserDto) => User.fromDto(dto) as User,
        'No items found'
      );

      expect(items).toHaveLength(0);
      expect(hasMore).toBe(false);
    });

    it('should throw custom error when items are null but success is true', () => {
      const response = {
        success: true,
        message: null,
        items: null,
        hasMore: false,
      };

      expect(() =>
        serverFacade.handlePagedItemsResponse(
          response,
          (dto: UserDto) => User.fromDto(dto) as User,
          'No followees found'
        )
      ).toThrow('No followees found');
    });

    it('should throw error for failed response', () => {
      const response = {
        success: false,
        message: 'Network timeout',
        items: null,
        hasMore: false,
      };

      expect(() =>
        serverFacade.handlePagedItemsResponse(
          response,
          (dto: UserDto) => User.fromDto(dto) as User,
          'No items found'
        )
      ).toThrow('Network timeout');
      expect(consoleErrorSpy).toHaveBeenCalledWith(response);
    });

    it('should work with Status items', () => {
      const response = {
        success: true,
        message: null,
        items: [
          {
            statusId: 'status1',
            userId: 'user1',
            contents: 'Hello world!',
            postTime: 1234567890,
            user: {
              userId: 'user1',
              firstName: 'John',
              lastName: 'Doe',
              alias: '@john',
              imageUrl: 'http://example.com/john.jpg',
            },
          },
        ],
        hasMore: false,
      };

      const [items, hasMore] = serverFacade.handlePagedItemsResponse(
        response,
        (dto: StatusDto) => Status.fromDto(dto) as Status,
        'No statuses found'
      );

      expect(items).toHaveLength(1);
      expect(items[0]).toBeInstanceOf(Status);
      expect(items[0].contents).toBe('Hello world!');
      expect(hasMore).toBe(false);
    });

    it('should apply converter function to each item', () => {
      const response = {
        success: true,
        message: null,
        items: [
          { userId: '1', firstName: 'A', lastName: 'B', alias: '@a', imageUrl: 'url1' },
          { userId: '2', firstName: 'C', lastName: 'D', alias: '@c', imageUrl: 'url2' },
          { userId: '3', firstName: 'E', lastName: 'F', alias: '@e', imageUrl: 'url3' },
        ],
        hasMore: true,
      };

      const [items, hasMore] = serverFacade.handlePagedItemsResponse(
        response,
        (dto: UserDto) => User.fromDto(dto) as User,
        'No items found'
      );

      expect(items).toHaveLength(3);
      items.forEach((item) => {
        expect(item).toBeInstanceOf(User);
      });
      expect(hasMore).toBe(true);
    });
  });
});
