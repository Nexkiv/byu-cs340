# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Twitter-like social media application built with AWS serverless architecture. Uses npm workspaces monorepo with three packages: `tweeter-shared` (DTOs/models), `tweeter-web` (React SPA), and `tweeter-server` (AWS Lambda backend).

## Claude Code Preferences

**Manual Builds and Deployments:** The user handles all builds and deployments manually. Claude should NOT run:

- `npm run build` or `npm run compile` (any package)
- `sam build` or `sam deploy`
- `npm run deploy` (tweeter-server)
- Any deployment-related commands

Claude should prepare code changes and inform the user when they're ready to build/deploy.

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

# Run integration test (post status and verify in story)
cd tweeter-web && npm test -- PostStatus.integration.test.ts
```

**Integration Test**: `PostStatus.integration.test.ts` tests full flow: login → post status via presenter → verify "Status posted!" message → retrieve story → verify status appears with correct details. Combines real API calls with mocked PostStatusView.

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

### Follower/Followee Count Caching

**Problem:** 10,000+ followers caused `ProvisionedThroughputExceededException` (100+ queries, 1-2s response).

**Solution:** Denormalized counts in `user` table with atomic DynamoDB ADD operations during follow/unfollow. UserDAO provides `incrementFollowerCount()` and `incrementFolloweeCount()` methods. FollowDAO calls these after creating/deleting follow records.

**Performance:** 100+ queries → 1 query, 1-2s → <50ms. Trade-off: +2 writes per follow/unfollow (acceptable since reads >> writes).

**Maintenance:** Auto-maintained, new users initialized with 0. Scripts: `backfill-user-counts` (one-time), `reconcile-user-counts` (weekly). Expected drift: <1%.

### DynamoDB Tables

**user:**
- Primary key: `userId` (string)
- GSI: `alias_index` (alias → userId lookup)
- Attributes: `userId`, `firstName`, `lastName`, `alias`, `imageUrl`, `password` (hashed), `followerCount`, `followeeCount`
- **Denormalized Counts**: `followerCount` and `followeeCount` are cached for O(1) retrieval
- **Performance**: Eliminates expensive pagination queries (100+ operations → 1 operation)
- **Maintenance**: Automatically updated via atomic DynamoDB ADD operations during follow/unfollow

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

**tweeter-profile-images-kevkp:** Profile pictures uploaded during registration. Key: `images/{userId}.{extension}`. Public read ACL, CORS enabled. Flow: Register → ImageDAO.putImage() → S3 upload → URL stored in user.imageUrl.

### SQS Queues (Asynchronous Feed Cache)

**Two-stage pipeline:**
- **Queue 1 (FeedCacheFanoutQueue)**: Receives post events, Lambda paginates 200 followers/batch, publishes to Queue 2, re-enqueues to self if more followers. DLQ: 3 retries.
- **Queue 2 (FeedCacheBatchWriteQueue)**: Receives follower batches, writes to cachedFeed (25-item chunks). DLQ: 2 retries.

**Flow:** Post → Queue 1 → Return 200 OK (~100ms) → Lambda 1 (fetch followers) → Queue 2 → Lambda 2 (write cache)

**AWS Lambda Recursion Detection Fix:**
- Issue: Lambda 1 self-re-enqueuing triggers AWS `RecursiveLoop: Terminate` after ~16 batches
- Fix: `aws lambda put-function-recursion-config --function-name FeedCacheFanoutFunction --recursive-loop Allow`
- Alternative: Use separate continuation queue to break recursion detection

**Milestone 4b Optimizations (10K followers in 11.5s, 10× under 120s requirement):**
- DynamoDB: `followee_index` 15→50 RCU, `user` table 15→50 RCU, `cachedFeed` 100 WCU (max)
- SQS: BatchSize=1, MaximumBatchingWindowInSeconds=0 (eliminates batching delays)
- Account limit: 10 concurrent Lambda executions (student account, requested increase)

**Message Loss Bug Fixes (Dec 2024):**

The async feed cache system was experiencing 20% message loss (~2,000/10,000 followers) due to two bugs:

**Bug #1: Silent Error Swallowing in FeedCacheBatchWriteLambda**
- **Problem:** Catch block only threw non-DynamoDB errors, swallowing throttling exceptions
- **Impact:** When DynamoDB throttled batch writes, Lambda succeeded without retry → SQS deleted message → 200 followers lost per message
- **Fix:** Remove conditional error swallowing - throw ALL errors to trigger SQS retry via RedrivePolicy

**Bug #2: Missing UnprocessedItems Retry in DynamoDBBatchHelpers**
- **Problem:** `executeBatchWrite()` ignored `UnprocessedItems` returned by BatchWriteCommand during throttling
- **Impact:** Partial write failures (10-25 items per 200-follower batch) accumulated across 50 batches
- **Fix:** Add retry loop with exponential backoff (1s, 2s, 4s max 5s, 3 max retries) to handle `UnprocessedItems`
- **Strategy:** Accept partial failures after max retries (logs warning) rather than throwing error that causes complete batch loss via DLQ

**Result After Fixes:**
- ~95-99% message delivery (significant improvement from 80% before fixes)
- Automatic retry handling for DynamoDB throttling (3 attempts with exponential backoff)
- Partial failures logged but don't cause complete batch loss
- Messages stay out of DLQ (partial success preferred over complete batch failure)
- ~100ms response time maintained (async architecture preserved)

### Authentication & Session Tokens

Session-based auth with 24-hour expiration in DynamoDB `session` table. Flow: Login → create session → client stores token → services validate via `Service.doAuthenticatedOperation()` → logout deletes session. SessionTokenDto: `{ tokenId, userId, expirationTime }`.

### Registration Validation

`UserService.register()` validates alias uniqueness before userId generation/S3 upload. Throws `"bad-request: Alias already exists"` → HTTP 400. ~0.5% race window (acceptable).

### PagedItemRequest Pattern (IMPORTANT)

All paged endpoints use `userId`, NOT `alias`. Structure: `{ userId, pageSize, lastItem, lastFollowTime? }`. Frontend has full User object, no lookup needed. DynamoDB indexed by userId.

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

**Story:** User's own posts (queries `status` table `user_index` GSI, hydrates user data).
**Feed:** Posts from followed users (denormalized `cachedFeed` table, O(1) query, no hydration).

**Cached Feed:** Asynchronous SQS-based. postStatus() → Queue 1 → returns ~100ms (10-50× faster). Cache updated asynchronously (1-30s lag). Follow: no backfill. Unfollow: no purge. Backfill: `npm run backfill-feed-cache`.

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

### Queue Lambdas (Async Feed Cache)
- `tweeter-server/src/lambda/queue/FeedCacheFanoutLambda.ts` - Fan-out planning, stream pagination
- `tweeter-server/src/lambda/queue/FeedCacheBatchWriteLambda.ts` - Batch write to cachedFeed table
- `tweeter-server/src/model/queue/FeedCacheFanoutMessage.ts` - Queue 1 message DTO
- `tweeter-server/src/model/queue/FeedCacheBatchWriteMessage.ts` - Queue 2 message DTO

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

**VS Code can't find tweeter-shared:** Rebuild tweeter-shared, restart VS Code.
**Build fails tweeter-server:** Build tweeter-shared first, run `npm run update` in tweeter-server.
**Lambda deployment fails:** Check AWS credentials, template.yaml syntax, handler exports.
**Frontend can't reach API:** Check API Gateway URL in ServerFacade, CORS in api.yaml, auth token included.

## Known Technical Debt

**Lambda Function Naming:** 15+ existing functions use `lowerCamelCase` (non-AWS standard), 2 new queue functions use `PascalCase` (AWS standard). Migration requires renaming in template.yaml, updating ~30+ `!Ref` references, redeploying (resource replacement, downtime). Deferred: system stable, migration risky, better between semesters.

## DynamoDB Best Practices & Critical Gotchas

**FilterExpression + Limit:** DynamoDB applies `Limit` BEFORE `FilterExpression`. With `Limit: 1` + `FilterExpression`, may return 0 results even if matches exist. Remove `Limit` or set high enough to include filtered results.

**attribute_not_exists() vs null:** `attribute_not_exists(field)` checks if attribute key exists, not if value is null. For soft-delete patterns, omit attribute entirely (don't set to `null`).

**GSI Eventual Consistency:** 1-2 second propagation delay. Design for eventual consistency (idempotent operations, optimistic UI). For tests, add delays between write/read.

**DAO Idempotency:** Check if record exists before creating. Return existing if found. Prevents duplicates during concurrent requests or retries.

## Test Data Population Scripts

```bash
cd tweeter-server
npm run populate-test-users          # 20 users from FakeData
npm run populate-test-statuses       # 40 posts (2 per user)
npm run populate-test-follows        # 44 active follow relationships
npm run populate-test-follow-history # follow + unfollow (soft-delete testing, run separately for GSI propagation)
npm run backfill-feed-cache          # Run AFTER posts/follows (rate-limited 1 post/sec)
npm run backfill-user-counts         # Backfill followerCount/followeeCount for existing users (with auto-retry)
npm run reconcile-user-counts        # Verify and fix count drift (run weekly or on-demand)
```

## Test Compatibility Updates (December 2025)

Tests in `tweeter-web/test/` updated for `followerCount`/`followeeCount` fields and `AuthToken` → `SessionToken` rename.

**Key changes:**
- `User` constructor: 4 params → 7 params (added `userId`, `followerCount`, `followeeCount`)
- `UserDto`: Must include `followerCount` and `followeeCount` fields
- `SessionToken` constructor: 2 params → 3 params (added `userId`)
- `PagedUserItemRequest`: Must include `lastFollowId` field
- UserFollow endpoints return `{user, followTime, followId}` structure (tuple arrays `[User, number, string][]`)
- Fixed `userMap.values()` → `Array.from(userMap.values())` in test scripts for TypeScript compatibility

**Updated files:** `test/presenter/*.test.ts`, `test/components/**/*.test.tsx`, `test/net/ServerFacade.test.ts`, `test/model.service/*.test.ts`

### Backfill/Reconcile User Counts Scripts

**backfill-user-counts**: Populates `followerCount`/`followeeCount` for all users. Auto-retry with exponential backoff, idempotent. Run after deploying count caching or data migrations. ~10 min/1000 users.

**reconcile-user-counts**: Detects/fixes drift between cached and actual counts. Run weekly or after inconsistencies. Expected drift: <1% normal, >5% critical.
