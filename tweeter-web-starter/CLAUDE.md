# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Twitter-like social media application built with AWS serverless architecture. Uses npm workspaces monorepo with three packages: `tweeter-shared` (DTOs/models), `tweeter-web` (React SPA), and `tweeter-server` (AWS Lambda backend).

## Common Commands

### Initial Setup
```bash
# From root - installs all workspaces
npm install

# Build everything (must follow this order)
npm run build
# Builds: tweeter-shared → tweeter-server → tweeter-web
```

**Important:** After building `tweeter-shared`, restart VS Code to resolve module resolution issues.

### Development
```bash
# Start frontend dev server (from root)
npm start

# Or from tweeter-web directory
cd tweeter-web && npm run dev
```

### Testing
```bash
# Run all tests (from root)
npm test

# Run tests from tweeter-web
cd tweeter-web && npm test

# Run specific test file
cd tweeter-web && npm test -- StatusService.test.ts
```

### Building Individual Packages
```bash
# tweeter-shared (always build first if changed)
cd tweeter-shared && npm run build

# tweeter-server
cd tweeter-server && npm run build

# tweeter-web
cd tweeter-web && npm run build
```

### Deployment
```bash
# Deploy backend to AWS (from root)
npm run deploy

# Manual deployment
cd tweeter-server
npm run update  # Copy node_modules to layer
sam build
sam deploy
```

## Architecture

### Request Flow Pattern
```
React Component → Presenter → Service (tweeter-web)
  → ServerFacade → API Gateway → Lambda Handler
  → Service (tweeter-server) → DAO Factory → DAO Implementation → DynamoDB
```

### Key Design Patterns

**MVP Pattern (Frontend):**
- Components (Views) render UI and delegate logic to Presenters
- Presenters contain business logic, state management, and call Services
- Services handle API communication via ServerFacade

**Factory Pattern (Backend):**
- DAOs are created through factories (e.g., `UserDAOFactory.getInstance().getUserDAO()`)
- Never instantiate DAOs directly (e.g., `new DynamoDBUserDAO()`)
- Enables swapping implementations (DynamoDB vs Test vs future implementations)

**Layered Architecture (Backend):**
- Lambda handlers receive/validate requests
- Services contain business logic and orchestrate DAOs
- DAOs handle all database operations
- Each layer only talks to the layer directly below it

**Authentication Template Method Pattern (Backend):**

All service methods validate session tokens using a template method pattern that enforces authentication security by default.

**Base Service Class** (`Service.ts`):
```typescript
export abstract class Service {
  protected sessionDAO: SessionDAO;

  constructor() {
    this.sessionDAO = SessionDAOFactory.create("dynamo");
  }

  protected async doAuthenticatedOperation<T>(
    token: string,
    operation: (userId: string) => Promise<T>
  ): Promise<T> {
    const session = await this.sessionDAO.validateSessionToken(token);
    if (!session) {
      throw new Error("unauthorized: Invalid or expired session token");
    }
    return await operation(session.userId);
  }
}
```

**Service Implementation Pattern:**
- All service classes extend `Service` base class
- All public methods that require authentication wrap logic with `doAuthenticatedOperation`
- The template method validates token and extracts userId
- Business logic receives authenticated userId via callback

Example:
```typescript
export class FollowService extends Service {
  public async follow(
    token: string,
    userToFollowId: string
  ): Promise<[followerCount: number, followeeCount: number]> {
    return this.doAuthenticatedOperation(token, async (currentUserId) => {
      // currentUserId is extracted from validated token
      await this.followDAO.follow(currentUserId, userToFollowId);

      // Return counts FOR the displayed user
      const followerCount = await this.followDAO.getFollowerCount(userToFollowId);
      const followeeCount = await this.followDAO.getFolloweeCount(userToFollowId);

      return [followerCount, followeeCount];
    });
  }
}
```

**Error Handling:**
- Services throw errors with lowercase prefixes matching API Gateway patterns:
  - `"unauthorized"` → HTTP 401 (invalid/expired token)
  - `"forbidden"` → HTTP 403 (valid token but not allowed)
  - `"bad-request"` → HTTP 400 (invalid input)
  - `"internal-server-error"` → HTTP 500 (system errors)
- Lambda handlers let errors bubble up to API Gateway (no try-catch)
- API Gateway maps error messages to HTTP status codes (see `api.yaml` response mappings)

**Lambda Handler Pattern:**
```typescript
export const handler = async (request: SomeRequest): Promise<SomeResponse> => {
  const service = new SomeService();

  // No try-catch - let service errors propagate to API Gateway
  const result = await service.someMethod(request.token, ...otherParams);

  return { success: true, ...result };
};
```

**Benefits:**
- Services enforce their own authentication (security by default)
- No auth code duplication across Lambda handlers
- Consistent error handling and HTTP status codes
- Lambda handlers are thin wrappers focused on HTTP concerns
- Template method extracts userId from token, eliminating redundant parameters

### Critical Build Dependencies

**Build Order Matters:**
1. `tweeter-shared` exports DTOs and domain models
2. `tweeter-server` imports from `tweeter-shared` (file: dependency)
3. `tweeter-web` imports from `tweeter-shared` (file: dependency)

When you modify `tweeter-shared`, you MUST:
1. Run `npm run build` in `tweeter-shared`
2. Run `npm run update` in `tweeter-server` (updates node_modules reference)
3. Rebuild `tweeter-web` if it imports the changed code
4. Restart VS Code for module resolution

### API Request/Response Pattern

All API endpoints follow this pattern:
- **Method:** POST (even for reads)
- **Request:** Contains specific request DTO from `tweeter-shared/src/model/net/request/`
- **Response:** Contains `success`, `message`, and specific response DTO from `tweeter-shared/src/model/net/response/`

Example flow for adding an endpoint:
1. Define `FooRequest` and `FooResponse` in `tweeter-shared/src/model/net/`
2. Rebuild `tweeter-shared`
3. Add endpoint to `tweeter-server/api.yaml`
4. Create Lambda handler in `tweeter-server/src/lambda/foo/FooLambda.ts`
5. Add to `tweeter-server/template.yaml` SAM configuration
6. Implement service method in `tweeter-server/src/model/service/`
7. Add ServerFacade method in `tweeter-web/src/net/ServerFacade.ts`
8. Deploy backend, rebuild frontend

### DAO Layer Pattern

Each database entity follows this structure:
```
dao/
├── interface/FooDAO.ts          # Interface defining contract
├── dynamo/DynamoDBFooDAO.ts     # DynamoDB implementation
├── s3/S3FooDAO.ts               # S3 implementation (for storage DAOs)
├── factory/FooDAOFactory.ts     # Factory for creating DAOs
└── test/TestFooDAO.ts           # In-memory test implementation
```

**Current DAOs:**
- `UserDAO` - User profile management (login, registration, user lookup)
- `FollowDAO` - Follow relationships (follow/unfollow, follower/followee lists, counts)
- `StatusDAO` - Status posts (create post, story feed, user feed)
- `SessionDAO` - Session token management (create, validate, delete sessions)
- `ImageDAO` - S3 image storage (profile picture uploads)
- `FeedCacheDAO` - Cached feed storage (batch write to caches, load cached feed)

**Always use factories:**
```typescript
// Correct
const dao = UserDAOFactory.create("dynamo");
const dao = FollowDAOFactory.create("dynamo");
const dao = StatusDAOFactory.create("dynamo");
const dao = SessionDAOFactory.create("dynamo");
const dao = FeedCacheDAOFactory.create("dynamo");
const dao = ImageDAOFactory.create("s3");

// Wrong - don't do this
const dao = new DynamoDBUserDAO();
const dao = new DynamoDBFeedCacheDAO();
const dao = new S3ImageDAO();
```

### DynamoDB Tables

**user:**
- Primary key: `userId` (string)
- GSI: `alias_index` (alias → userId lookup)

**follow:**
- Primary key: `followId` (UUID string)
- GSI 1: `follower_index` (followerUserId + followTime) - for "who does X follow?"
- GSI 2: `followee_index` (followeeUserId + followTime) - for "who follows X?"
- Attributes: `followerUserId`, `followeeUserId`, `followTime`, `unfollowTime` (optional)
- Uses soft-delete pattern: `unfollowTime` marks inactive relationships

**status:**
- Primary key: `statusId` (UUID string) + `postTime` (number, sort key)
- GSI: `user_index` (userId + postTime) - for querying posts by author
- Attributes: `statusId`, `userId`, `contents`, `postTime`
- Used for both story (user's own posts) and feed (posts from followed users)

**session:**
- Primary key: `tokenId` (UUID string)
- GSI: `user_index` (userId + expirationTime) - for querying sessions by user
- Attributes: `tokenId`, `userId`, `expirationTime` (number, Unix timestamp)
- Used for session token validation and authentication
- Tokens expire after 24 hours

**cachedFeed:**
- Primary key: `userId` (string, follower) + `postTime` (number, sort key)
- No GSI - optimized for single-query feed loads
- Attributes: `userId`, `postTime`, `statusId`, `contents`, `authorUserId`, `authorAlias`, `authorFirstName`, `authorLastName`, `authorImageUrl`
- Denormalized cache for feed items with pre-populated user data
- **Performance**: Reduces feed loading from O(n) queries to O(1) single query
- **Population**: Push-based (posts written to all followers' caches synchronously)
- **Behavior**: Only posts created AFTER follow appear (no backfill), old posts remain after unfollow

**Naming Convention:** All DynamoDB attributes use camelCase (e.g., `followerUserId`, not `follower_user_id`)

### S3 Buckets

**tweeter-profile-images-kevkp:**
- Stores user profile pictures uploaded during registration
- **Key structure**: `images/{userId}.{extension}` (e.g., `images/550e8400-e29b-41d4-a716-446655440000.png`)
- **Access**: Public read via ACL (ObjectCannedACL.public_read)
- **CORS**: Enabled for GET/HEAD methods to allow browser access
- **URL format**: `https://tweeter-profile-images-kevkp.s3.us-east-1.amazonaws.com/images/{fileName}`
- **Content-Type detection**: Automatically sets based on file extension (png, jpg, jpeg, gif, webp)

**Image Upload Flow:**
1. User registers with profile image (frontend sends Uint8Array + extension)
2. `UserService.register()` calls `ImageDAO.putImage(fileName, base64String)`
3. `S3ImageDAO` uploads to S3 bucket with public-read ACL
4. Returns S3 URL which is stored in user's `imageUrl` field
5. Frontend displays image directly from S3 URL

### Authentication & Session Tokens

The application uses session-based authentication with tokens stored in DynamoDB.

**SessionToken Model:**
```typescript
interface SessionTokenDto {
  readonly tokenId: string;        // UUID for the session
  readonly userId: string;          // User who owns this session
  readonly expirationTime: number;  // Unix timestamp when token expires
}
```

**Authentication Flow:**
1. User logs in with alias/password → `LoginLambda`
2. `UserService.login()` validates credentials via `UserDAO.checkPassword()`
3. Service creates session token with 24-hour expiration via `SessionDAO.createSession()`
4. Token returned to client in `LoginResponse`
5. Client stores token and includes in all subsequent requests
6. Each service method validates token via `Service.doAuthenticatedOperation()` template method
7. Template method calls `SessionDAO.validateSessionToken()` to check validity and get userId

**Session Management:**
- Sessions expire after 24 hours (configurable in `SessionDAO`)
- Expired sessions are automatically rejected during validation
- Logout invalidates the session token via `SessionDAO.deleteSession()`

**Security:**
- All service methods require valid session token (enforced by base `Service` class)
- Services validate token and extract userId before executing business logic
- Invalid/expired tokens throw "unauthorized" error → HTTP 401

### PagedItemRequest Pattern (IMPORTANT)

**All paged endpoints use `userId`, NOT `alias`:**

```typescript
// PagedItemRequest structure
interface PagedItemRequest<D> {
  readonly userId: string;      // User ID (NOT alias!)
  readonly pageSize: number;
  readonly lastItem: D | null;
  readonly lastFollowTime?: number | null;
}
```

**Why userId instead of alias:**
- Frontend already has the full User object with userId when making requests
- More efficient - no need for Lambda to look up userId from alias
- Direct database queries - DynamoDB tables are indexed by userId
- Consistent across all paged endpoints (story, feed, followers, followees)

**Lambda Handler Pattern:**
```typescript
// Lambda receives userId directly - NO lookup needed
export const handler = async (request: PagedItemRequest) => {
  const service = new Service();
  const [items, hasMore] = await service.loadMore(
    request.token,
    request.userId,  // Use directly
    request.pageSize,
    request.lastItem
  );
  return { success: true, items, hasMore };
};
```

**Frontend Flow:**
1. `ItemScroller` passes `displayedUser.userId` to presenter
2. Presenter passes `userId` to service
3. Service sends `userId` in API request
4. Lambda uses `request.userId` directly (no alias-to-userId lookup)
5. Service queries DynamoDB by userId on appropriate GSI

**DO NOT** add alias-to-userId lookups in Lambda handlers - this was the old pattern and has been removed for efficiency.

### Frontend Routing

```typescript
// Authenticated routes (require login)
/story      → User's own posts
/feed       → Posts from followed users
/followers  → List of followers
/followees  → List of followees

// Unauthenticated routes
/login      → Login page
/register   → Registration page
```

### Status/Feed Implementation

**StatusDto Structure:**
```typescript
interface StatusDto {
  readonly statusId: string;    // UUID for the post
  readonly userId: string;       // Author's userId (stored in DB)
  readonly user?: UserDto;       // Optional: hydrated by service layer for frontend
  readonly contents: string;     // Post text with mentions/URLs
  readonly postTime: number;     // Unix timestamp (sort key)
}
```

**Story vs Feed:**

- **Story** (`loadMoreStoryItems`): User's own posts
  - Queries `status` table by `userId` on `user_index` GSI
  - Hydrates user data via `hydrateUsers()` helper
  - Simple, normalized design

- **Feed** (`loadMoreFeedItems`): Posts from followed users
  - Uses **cached feed table** for performance (O(1) query instead of O(n))
  - Pre-computed, denormalized cache with user data already populated
  - No hydration needed on read

**Cached Feed Architecture:**

The feed uses a denormalized cache (`cachedFeed` table) to achieve O(1) feed loads instead of querying every followed user.

**Cache Population (Push-Based):**
```typescript
// StatusService.postStatus() - when user posts
public async postStatus(token: string, userId: string, contents: string) {
  // 1. Write to status table
  await this.statusDAO.postStatus(statusDto);

  // 2. Populate cache for ALL followers
  await this.populateFeedCache(statusDto);
}

private async populateFeedCache(status: StatusDto) {
  const author = await this.userDAO.getUserById(status.userId);
  const hydratedStatus = { ...status, user: author };

  // Get all current followers
  const followerUserIds = await this.getAllFollowerUserIds(status.userId);

  // Write to each follower's cache (BatchWrite in chunks of 25)
  await this.feedCacheDAO.batchAddToCache(followerUserIds, hydratedStatus);
}
```

**Cache Reading (Single Query):**
```typescript
// StatusService.loadMoreFeedItems() - when user loads feed
public async loadMoreFeedItems(token, userId, pageSize, lastItem) {
  // Single DynamoDB query - no hydration needed!
  const [statuses, hasMore] = await this.feedCacheDAO.loadCachedFeed(
    userId,
    lastItem,
    pageSize
  );

  return [statuses, hasMore]; // User data already populated
}
```

**Cache Behavior:**

| Event | Cache Behavior |
|-------|----------------|
| User posts | Post written to all **current** followers' caches synchronously |
| User follows someone | **NO backfill** - only future posts appear in feed |
| User unfollows someone | **NO purge** - old posts remain, new posts won't be added |

**Why no backfill?** When user A follows user B, A only sees B's NEW posts (created after the follow). This prevents overwhelming feeds with historical data.

**Why no purge?** When user A unfollows user B, B's old posts stay in A's feed (historical record), but B's future posts won't appear since A is no longer a follower.

**Performance Improvement:**
- **Before**: ~55 DynamoDB queries per feed load (1 per followee)
- **After**: 1 DynamoDB query per feed load
- **Gain**: 55x faster feed loads

**Trade-off:** Write amplification on post (1 write becomes 1 + N writes where N = follower count). Acceptable because:
- Read:Write ratio is ~10:1 in social media
- BatchWrite handles up to 25 items per API call
- SQS optimization can be added later (Milestone 4)

**Migration Script:**

For existing posts, run the backfill script:
```bash
cd tweeter-server
npm run backfill-feed-cache
```

This scans all posts and populates caches for their followers. Note: Rate-limited to 1 post/second to avoid throttling with 1 WCU.

## Key Files

### Configuration
- `tweeter-server/template.yaml` - SAM template (Lambda functions, DynamoDB tables, S3 buckets)
- `tweeter-server/api.yaml` - OpenAPI spec for API Gateway
- `tweeter-server/samconfig.toml` - SAM deployment settings

### Entry Points
- `tweeter-web/src/App.tsx` - React app routes and layout
- `tweeter-web/src/net/ServerFacade.ts` - All API calls go through here
- `tweeter-server/src/lambda/` - Lambda handler entry points organized by domain

### Storage DAOs
- `tweeter-server/src/dao/s3/S3ImageDAO.ts` - S3 image upload implementation
- `tweeter-server/src/dao/interface/ImageDAO.ts` - Image storage contract
- `tweeter-server/src/dao/factory/ImageDAOFactory.ts` - Factory for image storage

## Important Conventions

### TypeScript
- Strict mode enabled in all packages
- Use explicit types, avoid `any`
- DTOs for all network communication

### Naming
- Classes/Interfaces: PascalCase (`UserService`, `DynamoDBUserDAO`)
- Lambda handlers: Domain-based (`AuthenticationLambda.ts`)
- Files: PascalCase for classes

### Error Handling
- Services throw errors with lowercase prefixes (e.g., "unauthorized", "forbidden", "bad-request")
- Lambda handlers let errors bubble up to API Gateway (no try-catch)
- API Gateway maps error message prefixes to HTTP status codes via regex patterns
- Frontend displays errors via Toaster component

## Troubleshooting

**VS Code can't find tweeter-shared module:**
- Rebuild `tweeter-shared` and restart VS Code

**Build fails in tweeter-server:**
- Ensure `tweeter-shared` is built first
- Run `npm run update` in `tweeter-server` to sync dependencies

**Lambda deployment fails:**
- Check AWS credentials are configured
- Verify `template.yaml` syntax
- Ensure all handlers are properly exported

**Frontend can't reach API:**
- Check API Gateway URL in ServerFacade
- Verify CORS is enabled in `api.yaml`
- Check auth token is being sent with requests

## DynamoDB Best Practices & Critical Gotchas

### FilterExpression + Limit Interaction (CRITICAL BUG)

**Problem:** DynamoDB applies `Limit` BEFORE `FilterExpression`, not after.

```typescript
// ❌ WRONG - May return 0 results even if matches exist
const params = {
  KeyConditionExpression: "followerUserId = :userId",
  FilterExpression: "followeeUserId = :followee AND attribute_not_exists(unfollowTime)",
  Limit: 1,  // Gets 1 item by key, THEN filters (might not match)
};

// ✅ CORRECT - Remove Limit or set it high enough
const params = {
  KeyConditionExpression: "followerUserId = :userId",
  FilterExpression: "followeeUserId = :followee AND attribute_not_exists(unfollowTime)",
  // No Limit - scans until filter finds a match
};
```

**Why this matters:** If you query for `followerUserId = "user-1"` with `Limit: 1`, DynamoDB:
1. Gets the first item matching `followerUserId` (sorted by sort key)
2. Applies the `FilterExpression` to that ONE item
3. If it doesn't match → returns 0 results (even if item #2 would have matched)

**Where this broke us:** `isFollower()`, `getActiveFollow()`, and `unfollow()` all had `Limit: 1` with `FilterExpression` on `followeeUserId`, causing false negatives and duplicate creation.

### attribute_not_exists() vs null Values

**Problem:** `attribute_not_exists(field)` checks if the attribute key exists, not if the value is null.

```typescript
// ❌ WRONG - Creates attribute with NULL type
const item = {
  followId: "123",
  followerUserId: "user-1",
  followeeUserId: "user-2",
  unfollowTime: null,  // DynamoDB stores this as {"NULL": true}
};
// attribute_not_exists(unfollowTime) returns FALSE because attribute exists!

// ✅ CORRECT - Omit attribute entirely for active follows
const item = {
  followId: "123",
  followerUserId: "user-1",
  followeeUserId: "user-2",
  // Don't include unfollowTime at all
};
// attribute_not_exists(unfollowTime) returns TRUE ✓
```

**Rule:** For soft-delete patterns, omit the attribute entirely (don't set to null) when the entity is active.

### GSI Eventual Consistency

- GSIs have 1-2 second propagation delay after main table writes
- Queries on GSI immediately after write may not see new data
- For testing: add delays or separate test scripts for write/read operations
- For production: design for eventual consistency (idempotent operations, optimistic UI)

### Idempotency Pattern for DAOs

```typescript
async follow(followerUserId: string, followeeUserId: string): Promise<FollowDto> {
  // Check if active follow already exists
  const existingFollow = await this.getActiveFollow(followerUserId, followeeUserId);

  if (existingFollow) {
    return existingFollow;  // Idempotent: return existing
  }

  // Create new follow (omit unfollowTime attribute)
  const followItem = {
    followId: uuidv4(),
    followerUserId,
    followeeUserId,
    followTime: Date.now(),
    // No unfollowTime field!
  };

  await this.client.send(new PutCommand({ TableName: "follow", Item: followItem }));

  return { ...followItem, unfollowTime: null };  // Return DTO with null for API consistency
}
```

## Test Data Population Scripts

The project includes scripts to populate test data:

```bash
# Populate 20 test users (from tweeter-shared FakeData)
cd tweeter-server
npm run populate-test-users

# Populate test statuses (40 posts: 2 per user)
npm run populate-test-statuses

# Populate 44 active follow relationships
npm run populate-test-follows

# Create follow history (follow + unfollow for testing soft-delete)
npm run populate-test-follow-history

# Backfill cached feed table with existing posts
npm run backfill-feed-cache
```

**Notes:**
- Run populate-test-follow-history separately from populate-test-follows to allow natural time delays for GSI propagation
- Run backfill-feed-cache AFTER posts and follows are created to populate the cached feed table
- Backfill script is rate-limited (1 post/second) to avoid throttling with 1 WCU