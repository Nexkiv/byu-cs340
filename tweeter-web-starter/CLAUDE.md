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

**Authentication Template Method Pattern:**
- All services extend `Service` base class with `doAuthenticatedOperation<T>(token, operation)` template method
- Template method validates token and extracts userId before executing business logic
- Services enforce their own authentication (security by default, no auth code in Lambda handlers)

**Error Handling:**
- Services throw errors with lowercase prefixes: `"unauthorized"` (401), `"forbidden"` (403), `"bad-request"` (400), `"internal-server-error"` (500)
- Lambda handlers let errors bubble up to API Gateway (no try-catch)
- API Gateway maps error prefixes to HTTP status codes via regex in `api.yaml`

### Lambda Helper Utilities

All Lambda handlers use helpers from `tweeter-server/src/lambda/LambdaHelpers.ts` for consistent response formatting (~435 lines saved):
- `buildVoidResponse()` - void operations (logout, postStatus)
- `buildAuthResponse(user, token)` - login/register
- `buildPagedResponse<T>(items, hasMore)` - paginated lists
- `buildCountResponse(count, countType)` - follower/followee counts (function overloading for type safety)
- `buildFollowActionResponse(followerCount, followeeCount)` - follow/unfollow
- `buildSuccessResponse<T>(payload)` - generic success with custom payload

### ServerFacade Helper Methods

All ServerFacade methods use private helpers from `tweeter-web/src/net/ServerFacade.ts` for consistent error handling and DTO conversion (~200 lines saved):
- `handleVoidResponse(response)` - void operations
- `handleSimpleValueResponse<TResponse, TValue>(response, extractor)` - single value extraction
- `handleFollowActionResponse(response)` - returns `[followerCount, followeeCount]`
- `handleAuthResponse(response)` - auto-converts DTOs to domain models (User, SessionToken)
- `handleSingleObjectResponse<TDto, TModel>(response, dtoField, converter, errorMessage)` - single object with conversion
- `handlePagedItemsResponse<TDto, TModel>(response, converter, errorMessage)` - paginated lists with conversion

**Important:** Always explicitly type converter parameters (e.g., `(dto: UserDto) => User.fromDto(dto)`) to avoid TypeScript inference issues.

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

### DAO Code Duplication Reduction

All 5 DynamoDB DAOs extend `BaseDynamoDBDAO` (singleton client) and use utility functions (~300 lines saved):

**Architecture:**
```
dao/
├── base/BaseDynamoDBDAO.ts              # Singleton DynamoDB client
├── utils/
│   ├── DynamoDBQueryHelpers.ts         # buildPaginatedQuery, executePaginatedQuery, executeCountQuery, executeExistsQuery
│   ├── DynamoDBBatchHelpers.ts         # executeBatchWrite (auto-chunks to 25 items)
│   └── UserHydrationHelpers.ts         # batchGetUsers, hydrateFollowsWithUsers
└── dynamo/*DAO.ts                      # All extend BaseDynamoDBDAO
```

**Key utilities:**
- `buildPaginatedQuery` + `executePaginatedQuery<T>` → `[items, hasMore]`
- `executeCountQuery` → count (accumulates across pages with FilterExpression)
- `executeExistsQuery` → boolean (existence check)
- `executeBatchWrite` → auto-chunks batch writes to 25-item batches
- `batchGetUsers` → Map<userId, UserDto> (O(1) lookup)
- `hydrateFollowsWithUsers` → combines follow metadata with user data

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

Session-based authentication with 24-hour expiration stored in DynamoDB `session` table.

**Flow:**
1. Login → `UserService.login()` validates credentials and creates session via `SessionDAO.createSession()`
2. Client stores token and includes in all subsequent requests
3. Services validate token via `Service.doAuthenticatedOperation()` template method
4. Logout invalidates token via `SessionDAO.deleteSession()`

**SessionTokenDto:** `{ tokenId, userId, expirationTime }` (24-hour expiration, auto-rejected when expired)

### Registration Validation

`UserService.register()` validates alias uniqueness via `getUserByAlias()` before creating user:
- Validation occurs **before** userId generation and S3 upload (efficiency)
- Throws `"bad-request: Alias already exists"` → HTTP 400
- Check-then-create has ~0.5% race window (acceptable: eliminates 99.5% of duplicates without infrastructure changes)

### PagedItemRequest Pattern (IMPORTANT)

**All paged endpoints use `userId`, NOT `alias`:**
- `PagedItemRequest<D>`: `{ userId, pageSize, lastItem, lastFollowTime? }`
- Frontend already has full User object with userId when making requests
- No alias-to-userId lookup needed in Lambda handlers (efficiency)
- DynamoDB tables indexed by userId (direct queries)

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

**StatusDto:** `{ statusId, userId, user?, contents, postTime }` (user hydrated by service layer for frontend)

**Story vs Feed:**
- **Story:** User's own posts (queries `status` table on `user_index` GSI, hydrates user data)
- **Feed:** Posts from followed users (uses denormalized `cachedFeed` table for O(1) query, no hydration needed)

**Cached Feed Architecture:**
- **Push-based cache:** `postStatus()` writes to all current followers' caches synchronously (BatchWrite chunks of 25)
- **Performance:** 55x faster (1 query vs ~55 queries per feed load)
- **Cache behavior:**
  - User posts → written to all current followers' caches
  - Follow → NO backfill (only future posts appear)
  - Unfollow → NO purge (old posts remain)
- **Trade-off:** Write amplification (1 write → 1+N writes, acceptable for 10:1 read:write ratio)
- **Backfill script:** `npm run backfill-feed-cache` (rate-limited 1 post/second)

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

**Backend:**
- Services throw errors with lowercase prefixes: `"unauthorized:"` (401), `"forbidden:"` (403), `"bad-request:"` (400), `"internal-server-error:"` (500)
- Lambda handlers let errors bubble up to API Gateway (no try-catch)
- API Gateway maps prefixes to HTTP status codes via regex in `api.yaml`

**Frontend:**
- **ClientCommunicator:** Extracts `error.error` from API Gateway, detects 401 and auto-redirects to `/login` (stores message in `sessionStorage`)
- **Presenter:** `cleanErrorMessage()` strips technical prefixes before displaying ("bad-request:" → "", "[Bad Request]" → "")
- **Login Page:** Checks `sessionStorage` for redirect messages on mount

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

```bash
cd tweeter-server
npm run populate-test-users          # 20 users from FakeData
npm run populate-test-statuses       # 40 posts (2 per user)
npm run populate-test-follows        # 44 active follow relationships
npm run populate-test-follow-history # follow + unfollow (soft-delete testing, run separately for GSI propagation)
npm run backfill-feed-cache          # Run AFTER posts/follows (rate-limited 1 post/sec)
```
