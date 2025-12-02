/**
 * Characterization tests for ServerFacade.
 * These tests document the current behavior before refactoring.
 */

import { ServerFacade } from '../../src/net/ServerFacade';
import { ClientCommunicator } from '../../src/net/ClientCommunicator';
import { User, SessionToken } from 'tweeter-shared';

// Mock the ClientCommunicator
jest.mock('../../src/net/ClientCommunicator');

describe('ServerFacade Characterization Tests', () => {
  let serverFacade: ServerFacade;
  let mockDoPost: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    serverFacade = new ServerFacade();
    mockDoPost = jest.spyOn(ClientCommunicator.prototype, 'doPost');
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Paged Items Pattern - getMoreFollowees', () => {
    it('should convert DTOs and return items with hasMore', async () => {
      const mockResponse = {
        success: true,
        message: null,
        items: [
          {
            userId: '1',
            firstName: 'Alice',
            lastName: 'Smith',
            alias: '@alice',
            imageUrl: 'http://example.com/alice.jpg',
          },
          {
            userId: '2',
            firstName: 'Bob',
            lastName: 'Jones',
            alias: '@bob',
            imageUrl: 'http://example.com/bob.jpg',
          },
        ],
        hasMore: true,
      };
      mockDoPost.mockResolvedValue(mockResponse);

      const request = {
        token: 'token123',
        userId: 'user123',
        pageSize: 10,
        lastItem: null,
        lastFollowTime: null,
      };
      const [users, hasMore] = await serverFacade.getMoreFollowees(request);

      expect(users).toHaveLength(2);
      expect(users[0]).toBeInstanceOf(User);
      expect(users[0].alias).toBe('@alice');
      expect(users[1].alias).toBe('@bob');
      expect(hasMore).toBe(true);
      expect(mockDoPost).toHaveBeenCalledWith(request, '/followee/list');
    });

    it('should throw error when response fails', async () => {
      const mockResponse = {
        success: false,
        message: 'Network error',
        items: null,
        hasMore: false,
      };
      mockDoPost.mockResolvedValue(mockResponse);

      const request = {
        token: 'token123',
        userId: 'user123',
        pageSize: 10,
        lastItem: null,
        lastFollowTime: null,
      };

      await expect(serverFacade.getMoreFollowees(request)).rejects.toThrow('Network error');
      expect(consoleErrorSpy).toHaveBeenCalledWith(mockResponse);
    });

    it('should throw error when items are null despite success', async () => {
      const mockResponse = {
        success: true,
        message: null,
        items: null,
        hasMore: false,
      };
      mockDoPost.mockResolvedValue(mockResponse);

      const request = {
        token: 'token123',
        userId: 'user123',
        pageSize: 10,
        lastItem: null,
        lastFollowTime: null,
      };

      await expect(serverFacade.getMoreFollowees(request)).rejects.toThrow('No followees found');
    });
  });

  describe('Paged Items Pattern - getMoreFollowers', () => {
    it('should convert DTOs and return items with hasMore', async () => {
      const mockResponse = {
        success: true,
        message: null,
        items: [
          {
            userId: '3',
            firstName: 'Charlie',
            lastName: 'Brown',
            alias: '@charlie',
            imageUrl: 'http://example.com/charlie.jpg',
          },
        ],
        hasMore: false,
      };
      mockDoPost.mockResolvedValue(mockResponse);

      const request = {
        token: 'token123',
        userId: 'user123',
        pageSize: 10,
        lastItem: null,
        lastFollowTime: null,
      };
      const [users, hasMore] = await serverFacade.getMoreFollowers(request);

      expect(users).toHaveLength(1);
      expect(users[0]).toBeInstanceOf(User);
      expect(users[0].alias).toBe('@charlie');
      expect(hasMore).toBe(false);
    });

    it('should propagate errors from failed responses', async () => {
      const mockResponse = {
        success: false,
        message: 'Unauthorized access',
        items: null,
        hasMore: false,
      };
      mockDoPost.mockResolvedValue(mockResponse);

      const request = {
        token: 'bad-token',
        userId: 'user123',
        pageSize: 10,
        lastItem: null,
        lastFollowTime: null,
      };

      await expect(serverFacade.getMoreFollowers(request)).rejects.toThrow('Unauthorized access');
      expect(consoleErrorSpy).toHaveBeenCalledWith(mockResponse);
    });
  });

  describe('Simple Value Extraction - getIsFollowerStatus', () => {
    it('should extract boolean field from response', async () => {
      const mockResponse = {
        success: true,
        message: null,
        isFollower: true,
      };
      mockDoPost.mockResolvedValue(mockResponse);

      const request = {
        token: 'token123',
        user: {
          userId: 'user1',
          firstName: 'John',
          lastName: 'Doe',
          alias: '@john',
          imageUrl: 'http://example.com/john.jpg',
        },
        selectedUser: {
          userId: 'user2',
          firstName: 'Jane',
          lastName: 'Smith',
          alias: '@jane',
          imageUrl: 'http://example.com/jane.jpg',
        },
      };

      const isFollower = await serverFacade.getIsFollowerStatus(request);

      expect(isFollower).toBe(true);
      expect(mockDoPost).toHaveBeenCalledWith(request, '/user/isfollower');
    });

    it('should throw error on failed response', async () => {
      const mockResponse = {
        success: false,
        message: 'Database error',
        isFollower: false,
      };
      mockDoPost.mockResolvedValue(mockResponse);

      const request = {
        token: 'token123',
        user: { userId: 'user1', firstName: '', lastName: '', alias: '', imageUrl: '' },
        selectedUser: { userId: 'user2', firstName: '', lastName: '', alias: '', imageUrl: '' },
      };

      await expect(serverFacade.getIsFollowerStatus(request)).rejects.toThrow('Database error');
      expect(consoleErrorSpy).toHaveBeenCalledWith(mockResponse);
    });
  });

  describe('Simple Value Extraction - getFolloweeCount', () => {
    it('should extract count from response', async () => {
      const mockResponse = {
        success: true,
        message: null,
        numFollowees: 42,
      };
      mockDoPost.mockResolvedValue(mockResponse);

      const request = {
        token: 'token123',
        user: {
          userId: 'user123',
          firstName: 'John',
          lastName: 'Doe',
          alias: '@john',
          imageUrl: 'http://example.com/john.jpg',
        },
      };

      const count = await serverFacade.getFolloweeCount(request);

      expect(count).toBe(42);
      expect(mockDoPost).toHaveBeenCalledWith(request, '/user/numfollowees');
    });
  });

  describe('Simple Value Extraction - getFollowerCount', () => {
    it('should extract count from response', async () => {
      const mockResponse = {
        success: true,
        message: null,
        numFollowers: 17,
      };
      mockDoPost.mockResolvedValue(mockResponse);

      const request = {
        token: 'token123',
        user: {
          userId: 'user123',
          firstName: 'John',
          lastName: 'Doe',
          alias: '@john',
          imageUrl: 'http://example.com/john.jpg',
        },
      };

      const count = await serverFacade.getFollowerCount(request);

      expect(count).toBe(17);
      expect(mockDoPost).toHaveBeenCalledWith(request, '/user/numfollowers');
    });
  });

  describe('Auth Response Pattern - login', () => {
    it('should convert user and token DTOs', async () => {
      const mockResponse = {
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
          expirationTime: Date.now() + 86400000,
        },
      };
      mockDoPost.mockResolvedValue(mockResponse);

      const request = { alias: '@john', password: 'password123' };
      const [user, token] = await serverFacade.login(request);

      expect(user).toBeInstanceOf(User);
      expect(user?.alias).toBe('@john');
      expect(token).toBeInstanceOf(SessionToken);
      expect(token?.tokenId).toBe('token123');
      expect(mockDoPost).toHaveBeenCalledWith(request, '/user/login');
    });

    it('should throw error on failed login', async () => {
      const mockResponse = {
        success: false,
        message: 'Invalid credentials',
        user: null,
        token: null,
      };
      mockDoPost.mockResolvedValue(mockResponse);

      const request = { alias: '@john', password: 'wrong' };

      await expect(serverFacade.login(request)).rejects.toThrow('Invalid credentials');
      expect(consoleErrorSpy).toHaveBeenCalledWith(mockResponse);
    });
  });

  describe('Auth Response Pattern - register', () => {
    it('should convert user and token DTOs', async () => {
      const mockResponse = {
        success: true,
        message: null,
        user: {
          userId: '456',
          firstName: 'Jane',
          lastName: 'Smith',
          alias: '@jane',
          imageUrl: 'http://example.com/jane.jpg',
        },
        token: {
          tokenId: 'token456',
          userId: '456',
          expirationTime: Date.now() + 86400000,
        },
      };
      mockDoPost.mockResolvedValue(mockResponse);

      const request = {
        alias: '@jane',
        password: 'password123',
        firstname: 'Jane',
        lastname: 'Smith',
        userImageBytes: new Uint8Array(),
        imageFileExtension: '.png',
      };
      const [user, token] = await serverFacade.register(request);

      expect(user).toBeInstanceOf(User);
      expect(user?.alias).toBe('@jane');
      expect(token).toBeInstanceOf(SessionToken);
      expect(token?.tokenId).toBe('token456');
      expect(mockDoPost).toHaveBeenCalledWith(request, '/user/register');
    });
  });

  describe('Single Object Pattern - getUser', () => {
    it('should convert user DTO and return User', async () => {
      const mockResponse = {
        success: true,
        message: null,
        user: {
          userId: '789',
          firstName: 'Bob',
          lastName: 'Wilson',
          alias: '@bob',
          imageUrl: 'http://example.com/bob.jpg',
        },
      };
      mockDoPost.mockResolvedValue(mockResponse);

      const request = {
        token: 'token123',
        alias: '@bob',
      };

      const user = await serverFacade.getUser(request);

      expect(user).toBeInstanceOf(User);
      expect(user?.alias).toBe('@bob');
      expect(mockDoPost).toHaveBeenCalledWith(request, '/user/get');
    });

    it('should throw error when user not found', async () => {
      const mockResponse = {
        success: true,
        message: null,
        user: null,
      };
      mockDoPost.mockResolvedValue(mockResponse);

      const request = {
        token: 'token123',
        alias: '@nonexistent',
      };

      await expect(serverFacade.getUser(request)).rejects.toThrow('No user found');
    });
  });

  describe('Void Operation Pattern - logout', () => {
    it('should complete successfully without return value', async () => {
      const mockResponse = {
        success: true,
        message: null,
      };
      mockDoPost.mockResolvedValue(mockResponse);

      const request = { token: 'token123' };

      await serverFacade.logout(request);

      expect(mockDoPost).toHaveBeenCalledWith(request, '/user/logout');
    });

    it('should throw error on failed logout', async () => {
      const mockResponse = {
        success: false,
        message: 'Session error',
      };
      mockDoPost.mockResolvedValue(mockResponse);

      const request = { token: 'invalid-token' };

      await expect(serverFacade.logout(request)).rejects.toThrow('Session error');
      expect(consoleErrorSpy).toHaveBeenCalledWith(mockResponse);
    });
  });

  describe('Void Operation Pattern - postStatusItem', () => {
    it('should complete successfully without return value', async () => {
      const mockResponse = {
        success: true,
        message: null,
      };
      mockDoPost.mockResolvedValue(mockResponse);

      const request = {
        token: 'token123',
        newStatus: {
          statusId: 'status1',
          userId: 'user123',
          contents: 'Hello world!',
          postTime: Date.now(),
        },
      };

      await serverFacade.postStatusItem(request);

      expect(mockDoPost).toHaveBeenCalledWith(request, '/status/post');
    });
  });

  describe('Follow Action Pattern - follow', () => {
    it('should return follower and followee counts', async () => {
      const mockResponse = {
        success: true,
        message: null,
        followerCount: 100,
        followeeCount: 50,
      };
      mockDoPost.mockResolvedValue(mockResponse);

      const request = {
        token: 'token123',
        user: {
          userId: 'user123',
          firstName: '',
          lastName: '',
          alias: '',
          imageUrl: '',
        },
      };

      const [followerCount, followeeCount] = await serverFacade.follow(request);

      expect(followerCount).toBe(100);
      expect(followeeCount).toBe(50);
      expect(mockDoPost).toHaveBeenCalledWith(request, '/user/follow');
    });

    it('should throw error on failed follow', async () => {
      const mockResponse = {
        success: false,
        message: 'Cannot follow user',
        followerCount: 0,
        followeeCount: 0,
      };
      mockDoPost.mockResolvedValue(mockResponse);

      const request = {
        token: 'token123',
        user: { userId: 'user123', firstName: '', lastName: '', alias: '', imageUrl: '' },
      };

      await expect(serverFacade.follow(request)).rejects.toThrow('Cannot follow user');
      expect(consoleErrorSpy).toHaveBeenCalledWith(mockResponse);
    });
  });

  describe('Follow Action Pattern - unfollow', () => {
    it('should return follower and followee counts', async () => {
      const mockResponse = {
        success: true,
        message: null,
        followerCount: 99,
        followeeCount: 49,
      };
      mockDoPost.mockResolvedValue(mockResponse);

      const request = {
        token: 'token123',
        user: {
          userId: 'user123',
          firstName: '',
          lastName: '',
          alias: '',
          imageUrl: '',
        },
      };

      const [followerCount, followeeCount] = await serverFacade.unfollow(request);

      expect(followerCount).toBe(99);
      expect(followeeCount).toBe(49);
      expect(mockDoPost).toHaveBeenCalledWith(request, '/user/unfollow');
    });
  });
});
