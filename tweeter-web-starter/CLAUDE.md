# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Twitter-like social media application built with AWS serverless architecture. Uses npm workspaces monorepo with three packages: `tweeter-shared` (DTOs/models), `tweeter-web` (React SPA), and `tweeter-server` (AWS Lambda backend).

## High-Level Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TWEETER APPLICATION                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────────────┐   │
│  │   Frontend   │         │     API      │         │     Backend      │   │
│  │  React SPA   │  ────> │   Gateway    │  ────>  │  Lambda + Data   │   │
│  │  (Vite Dev)  │  <────  │   (REST)     │  <────  │   (DynamoDB)     │   │
│  └──────────────┘         └──────────────┘         └──────────────────┘   │
│                                                                              │
│  Components              17 POST endpoints           15 API Lambdas         │
│  Presenters              CORS enabled                2 Queue Lambdas        │
│  Services                Error mapping               5 DynamoDB tables      │
│  ServerFacade                                        4 SQS queues           │
│                                                      1 S3 bucket            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Three-Tier Architecture

**1. Frontend (tweeter-web)** - React single-page application
- **MVP Pattern**: Views delegate to Presenters, Presenters orchestrate Services
- **Routing**: React Router with auth-protected routes (/story, /feed, /followers, /followees)
- **State Management**: Presenters manage state, notify Views of changes
- **API Communication**: All requests go through ServerFacade (single point of control)

**2. API Layer (AWS API Gateway)** - RESTful interface
- **All POST requests**: Even reads use POST for consistency
- **CORS enabled**: Supports browser-based clients
- **Error mapping**: Regex patterns convert service errors to HTTP status codes
- **Deployment stage**: Single 'prod' stage (can extend to dev/staging)

**3. Backend (tweeter-server)** - Serverless compute and storage
- **Lambda Functions**: Stateless request handlers (15 API + 2 queue processing)
- **Service Layer**: Business logic, authentication, orchestration
- **DAO Layer**: Database access with Factory pattern for swappable implementations
- **Storage**: DynamoDB (data), S3 (images), SQS (async queues)

### Why Serverless?

**Benefits**:
- **Auto-scaling**: Handles 1 request/sec or 1000 requests/sec without configuration
- **Cost-effective**: Pay only for actual usage (~$5-30/month for development)
- **No server management**: AWS handles patching, availability, monitoring
- **Fast development**: Focus on code, not infrastructure

**Trade-offs**:
- Cold starts (~2-5s first invocation)
- Vendor lock-in to AWS
- Local testing requires mocking/SAM local
- Debugging more complex (CloudWatch Logs)

### Why These Design Patterns?

**MVP (Model-View-Presenter) - Frontend**:
- **Separation of concerns**: Views only render, Presenters contain logic
- **Testability**: Can unit test Presenters without React components
- **Reusability**: Same Presenter can drive different Views

**Factory Pattern - DAO Layer**:
- **Dependency Injection**: Services don't know which DAO implementation they're using
- **Swappable implementations**: Test DAOs for unit tests, DynamoDB DAOs for production
- **Future-proofing**: Easy to add Redis cache or different database

**Template Method - Authentication**:
- **DRY principle**: Auth logic in base Service class, not repeated in every service
- **Security by default**: All operations require token validation unless explicitly public
- **Consistent error handling**: Unauthorized/forbidden errors handled uniformly

**Denormalization - Performance**:
- **Problem**: 10,000+ followers = 100+ queries to get count (1-2s response time)
- **Solution**: Store `followerCount`/`followeeCount` in user table (1 query, <50ms)
- **Trade-off**: Extra writes on follow/unfollow (acceptable, reads >> writes)
- **Maintenance**: Auto-maintained via atomic ADD operations, ~<1% drift

**Asynchronous Queues - UX**:
- **Problem**: Posting to 10,000 followers takes 10-30s (poor UX, timeouts)
- **Solution**: SQS two-stage pipeline, return 200 OK in ~100ms
- **Trade-off**: 1-30s lag for feed updates (acceptable for Twitter-like app)
- **Benefits**: 10-50× faster response, scales to millions of followers

### Request Flow Example: Post Status

```
User clicks "Post" button
  ↓
PostStatusPresenter.submitPost()
  ↓
StatusService.postStatus()
  ↓
ServerFacade.postStatus() → HTTP POST to API Gateway
  ↓
API Gateway → PostStatusItemLambda.handler()
  ↓
StatusService.postStatus() [backend]
  ↓
StatusDAO.createStatus() → DynamoDB status table
  ↓
SQS.sendMessage() → FeedCacheFanoutQueue
  ↓
Lambda returns 200 OK (~100ms) ←─────────┐
  ↓                                       │
Frontend updates UI                       │
  │                                       │
  │ Meanwhile (async, 1-30s):             │
  │                                       │
  ↓                                       │
FeedCacheFanoutLambda                     │
  - Fetches followers (200/batch)         │
  - Publishes to FeedCacheBatchWriteQueue │
  ↓                                       │
FeedCacheBatchWriteLambda                 │
  - Writes to cachedFeed table (25/chunk)│
  - Retries on throttling (3 attempts)    │
  ↓                                       │
User's followers see new post ────────────┘
```

### Data Flow Patterns

**Write-heavy operations** (follow/unfollow):
- Direct DynamoDB writes
- Atomic increment/decrement of counts
- Soft-delete pattern (unfollowTime) for audit trail

**Read-heavy operations** (feed loading):
- Denormalized cachedFeed table (pre-joined user data)
- Single query instead of N+1 (fetch posts, then fetch user for each post)
- O(n) → O(1) complexity

**Authentication flow**:
1. Login → SessionDAO.createSession() → 24-hour token
2. Client stores token in memory
3. Every request → Service.doAuthenticatedOperation() validates token
4. Logout → SessionDAO.deleteSession()

## Claude Code Preferences

**Manual Builds and Deployments:** The user handles all builds and deployments manually. Claude should NOT run:

- `npm run build` or `npm run compile` (any package)
- `sam build` or `sam deploy`
- `npm run deploy` (tweeter-server)
- Any deployment-related commands

Claude should prepare code changes and inform the user when they're ready to build/deploy.

## Complete Getting Started Guide

This guide takes you from zero to a fully running application in ~30-60 minutes.

###Prerequisites

- **Node.js 20+**: Download from [nodejs.org](https://nodejs.org/)
- **Git**: For cloning the repository
- **AWS Account**: Free tier is sufficient for development ([aws.amazon.com](https://aws.amazon.com))
- **AWS CLI**: Install from [AWS CLI docs](https://aws.amazon.com/cli/)
- **SAM CLI**: Install from [SAM CLI docs](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)

### Step 1: AWS Account Setup

```bash
# Configure AWS CLI with your credentials
aws configure
# Enter your Access Key ID, Secret Access Key, region (us-east-1), output format (json)

# Verify configuration
aws sts get-caller-identity
```

**Note**: SAM will auto-create an S3 bucket for deployments (configured in `samconfig.toml` with `resolve_s3=true`).

### Step 2: Clone and Install

```bash
# Clone repository
git clone <repository-url>
cd tweeter-web-starter

# Install all dependencies (root + all workspaces)
npm install
```

### Step 3: First-Time Build

```bash
# Build all packages in correct order
npm run build
# This runs: tweeter-shared → tweeter-server → tweeter-web
```

**IMPORTANT**: After building `tweeter-shared`, restart VS Code to resolve module resolution issues. Otherwise, TypeScript may not recognize imports from `tweeter-shared`.

### Step 4: Deploy to AWS

```bash
# Deploy backend infrastructure
npm run deploy
# This runs: npm run update && sam build && sam deploy
# Takes ~10-15 minutes on first deployment
```

**Output**: At the end of deployment, SAM will print the API Gateway URL. It looks like:
```
CloudFormation outputs from deployed stack
---
Outputs
---
Key                 TweeterApiUrl
Description         API Gateway endpoint URL
Value               https://9platxfqc3.execute-api.us-east-1.amazonaws.com/prod/
---
```

**Copy this URL** - you'll need it in the next step.

### Step 5: Configure Frontend

```bash
# Open tweeter-web/src/net/ServerFacade.ts
# Find the SERVER_URL constant (around line 10)
# Replace with your API Gateway URL from Step 4
```

Example:
```typescript
const SERVER_URL = "https://9platxfqc3.execute-api.us-east-1.amazonaws.com/prod";
```

**Rebuild frontend:**
```bash
cd tweeter-web
npm run build
```

### Step 6: Populate Test Data

```bash
cd tweeter-server

# Create 20 test users
npm run populate-test-users

# Create 40 status posts (2 per user)
npm run populate-test-statuses

# Create 44 follow relationships
npm run populate-test-follows

# Populate cached feed (takes ~1-2 min, rate-limited)
npm run backfill-feed-cache

# Backfill follower/followee counts
npm run backfill-user-counts
```

**Test Users**: The scripts use FakeData from `tweeter-shared`. Common test users:
- `@allen` (Ben Allen)
- `@amy` (Amy Ames)
- Password: Check `tweeter-shared/src/model/domain/FakeData.ts`

### Step 7: Run Locally

```bash
# From root directory
npm start

# Or from tweeter-web
cd tweeter-web && npm run dev
```

**Open**: [http://localhost:5173](http://localhost:5173)

### Step 8: First Login

1. Click "Register" or use existing test user
2. Login with `@allen` and password from FakeData
3. Navigate to `/feed` to see cached posts
4. Navigate to `/story` to see your own posts
5. Navigate to `/followers` or `/followees` to see relationships

### Verification Checklist

- [ ] AWS resources deployed (check CloudFormation console)
- [ ] API Gateway URL configured in ServerFacade
- [ ] Frontend builds without errors
- [ ] Test data populated (users, posts, follows)
- [ ] Dev server running on localhost:5173
- [ ] Can login with test user
- [ ] Feed shows posts from followed users
- [ ] Story shows own posts

### Common First-Time Issues

**"Module not found: tweeter-shared"**:
- Run `npm run build` in tweeter-shared
- Restart VS Code

**"Stack already exists" during deployment**:
- Previous deployment exists, SAM will update it
- Or delete: `sam delete --stack-name byu-cs340-tweeter-kevkp`

**API Gateway returns 403 CORS error**:
- Check `api.yaml` has CORS configuration
- Verify ServerFacade URL matches deployed API Gateway URL

**Test users not working**:
- Check DynamoDB tables exist (AWS console → DynamoDB)
- Re-run `npm run populate-test-users`

## Operations & Maintenance

### Shutting Down AWS Resources (Avoid Charges)

When you're done working on the project, you can delete all AWS resources to avoid ongoing charges:

```bash
# 1. Empty S3 bucket (if it has profile images)
aws s3 rm s3://tweeter-profile-images-kevkp --recursive

# 2. Delete CloudFormation stack
cd tweeter-server
sam delete --stack-name byu-cs340-tweeter-kevkp --region us-east-1

# 3. Verify deletion
aws cloudformation list-stacks --region us-east-1 | grep byu-cs340-tweeter-kevkp  # Should be DELETE_COMPLETE
aws dynamodb list-tables --region us-east-1  # Should not show tweeter tables
aws lambda list-functions --region us-east-1 | grep tweeter  # Should be empty
```

**Result**: $0/month AWS charges

### Restarting After Shutdown

Follow steps from "Complete Getting Started Guide":
1. Deploy to AWS (Step 4)
2. Update ServerFacade URL (Step 5)
3. Rebuild frontend (Step 5)
4. Populate test data (Step 6)
5. Run locally (Step 7)

**Note**: API Gateway URL will change after re-deployment. Always update ServerFacade.ts.

### Monitoring & Debugging

**CloudWatch Logs** (Lambda execution logs):
```bash
# View logs for specific function
aws logs tail /aws/lambda/loginFunction --follow

# Or use CloudWatch Logs Insights in AWS Console
```

**DynamoDB Metrics**:
- AWS Console → DynamoDB → Tables → Metrics
- Watch for `ProvisionedThroughputExceededException` (throttling)

**SQS Dead Letter Queues** (failed messages):
```bash
# Check DLQ message count
aws sqs get-queue-attributes \
  --queue-url https://sqs.us-east-1.amazonaws.com/<account-id>/FeedCacheFanoutDLQ \
  --attribute-names ApproximateNumberOfMessages
```

**Common Production Issues**:
- **401 Unauthorized**: Token expired or invalid (check SessionDAO, 24-hour expiration)
- **Lambda timeout**: Increase timeout in `template.yaml` (default 30s, max 15min)
- **DynamoDB throttling**: Increase RCU/WCU in `template.yaml` or switch to on-demand
- **SQS messages in DLQ**: Check Lambda logs for errors, manually inspect DLQ messages

### Cost Monitoring

**AWS Cost Explorer**:
- AWS Console → Billing → Cost Explorer
- Group by: Service
- Expected monthly cost: $5-30 (mostly DynamoDB provisioned capacity)

**Free Tier**:
- Lambda: 1M requests/month + 400,000 GB-seconds compute
- API Gateway: 1M API calls/month
- DynamoDB: 25 GB storage + 25 RCU + 25 WCU
- S3: 5 GB storage + 20,000 GET requests + 2,000 PUT requests

**Cost Breakdown**:
- DynamoDB provisioned capacity: ~$5-20/month (user table 50 RCU, follow GSIs 55 RCU, cachedFeed 100 WCU)
- Lambda: ~$0-5/month (covered by free tier for light use)
- API Gateway: ~$0-3/month (covered by free tier)
- S3: ~$0.02-1/month (storage + requests)
- SQS: ~$0-1/month (covered by free tier)

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

## AWS Idiosyncrasies & Gotchas

Understanding these AWS quirks will save you hours of debugging. See also: [DynamoDB Best Practices](#dynamodb-best-practices--critical-gotchas).

### SAM/CloudFormation

**Stack Updates Are Atomic**:
- All-or-nothing deployment (one resource fails = entire stack rolls back)
- Failed deployments require manual fix and re-deploy
- Check CloudFormation console for detailed error messages

**Resource Name Changes = Replacement**:
- Changing logical resource name in `template.yaml` triggers resource deletion + recreation
- Causes downtime and data loss for stateful resources (DynamoDB tables, S3 buckets)
- Workaround: Use `DeletionPolicy: Retain` for critical resources

**Auto S3 Bucket Creation**:
- `resolve_s3=true` in `samconfig.toml` auto-creates deployment bucket
- Bucket name: `aws-sam-cli-managed-default-samclisourcebucket-<random>`
- Contains Lambda code packages and template artifacts

**Capabilities Required**:
- `CAPABILITY_NAMED_IAM` required for creating named IAM roles
- SAM auto-adds this in samconfig.toml
- Without it: deployment fails with "requires capabilities" error

### Lambda

**Cold Starts**:
- First invocation: ~2-5 seconds (load code, initialize connections)
- Subsequent invocations: <100ms (reuses warm container)
- Mitigation: Keep functions warm with scheduled pings, or accept trade-off for cost savings

**Recursion Detection**:
- AWS detects when Lambda triggers itself (directly or indirectly)
- After ~16 iterations: `RecursiveLoop: Terminate` error
- Our fix: `aws lambda put-function-recursion-config --recursive-loop Allow`
- Better: Use separate continuation queue (FeedCacheFanoutContinuationQueue)

**Timeouts**:
- Default: 3 seconds (too short for most operations)
- Our default: 30 seconds (API Lambdas), 60 seconds (queue Lambdas)
- Maximum: 15 minutes (900 seconds)
- Exceeding timeout = Lambda forcibly terminated, no cleanup

**Immutable Layers**:
- Each layer update creates new version number
- Can't update existing layer version
- Functions must reference new version (SAM handles automatically)

**Environment Variables**:
- Max 4KB total size
- Sensitive values: Use AWS Secrets Manager or SSM Parameter Store
- Not encrypted by default (enable encryption in console)

### DynamoDB

**FilterExpression Applied AFTER Limit**:
- DynamoDB scans Limit items FIRST, THEN applies FilterExpression
- Example: `Limit: 10` + `FilterExpression: status='active'` may return 0-10 items (not guaranteed 10)
- Solution: Remove Limit or set high enough to account for filtering
- See: [DynamoDB Best Practices](#dynamodb-best-practices--critical-gotchas)

**GSI Eventual Consistency**:
- 1-2 second delay for writes to appear in Global Secondary Indexes
- Tests: Add `await new Promise(r => setTimeout(r, 2000))` between write and GSI query
- Design: Idempotent operations, optimistic UI updates

**Provisioned vs On-Demand**:
- **Provisioned**: Fixed RCU/WCU, lower cost for predictable traffic (~$5-20/month for our config)
- **On-Demand**: Pay per request, higher cost but auto-scales (good for spiky traffic)
- We use provisioned for cost control (50 RCU user table, 100 WCU cachedFeed)

**BatchWriteItem Limitations**:
- Max 25 items per batch
- No conditional writes in batch operations
- Partial failures returned as `UnprocessedItems` (must retry)
- Our helper: `executeBatchWrite()` auto-chunks and retries with exponential backoff

**Throttling**:
- `ProvisionedThroughputExceededException` when RCU/WCU exceeded
- DynamoDB has burst capacity (~5 minutes of unused capacity)
- Solution: Increase RCU/WCU in template.yaml or switch to on-demand

### S3

**Non-Empty Buckets Can't Be Deleted**:
- CloudFormation can't delete S3 bucket with objects
- Must empty first: `aws s3 rm s3://bucket-name --recursive`
- Or set `DeletionPolicy: Retain` (bucket stays after stack deletion)

**Public Access Requires Two Settings**:
1. Bucket policy (allows public GetObject)
2. Object ACL (set on upload: `public-read`)
- Missing either = 403 Forbidden

**CORS Configuration**:
- Required for browser-based uploads (pre-signed URLs)
- Configured in `template.yaml` under bucket properties
- Must include methods (GET, PUT, POST) and allowed origins

**Pre-Signed URLs**:
- Generated by Lambda for secure browser uploads
- Expires after specified time (we use 60 seconds)
- Includes authentication, bypasses bucket permissions

### SQS

**Visibility Timeout**:
- Hides message from other consumers while Lambda processes
- MUST exceed Lambda timeout (we use 120s for 60s Lambda)
- Too short: Message redelivered while still processing (duplicates)
- Too long: Delays retry on genuine failures

**Message Deletion**:
- Lambda runtime auto-deletes message on success
- Lambda error = message stays in queue (automatic retry)
- Max retries exceeded = moved to Dead Letter Queue (DLQ)

**Dead Letter Queues**:
- Receives messages after max retry attempts
- We use 2-3 retries before DLQ
- Monitor DLQ for system errors (throttling, bugs, bad data)
- Messages stay in DLQ for 14 days (manual inspection/replay)

**Batching vs Latency**:
- Higher BatchSize = fewer Lambda invocations (cost savings)
- But: Batching waits for full batch or timeout (adds latency)
- We use BatchSize=1, MaximumBatchingWindowInSeconds=0 (immediate processing)

**FIFO vs Standard**:
- Standard queues: At-least-once delivery, best-effort ordering (we use this)
- FIFO queues: Exactly-once delivery, guaranteed ordering (slower, higher cost)

### API Gateway

**CORS Must Be Explicit**:
- Configured in `api.yaml` for each endpoint
- Must include: allowed origins, methods, headers
- Missing CORS = browser blocks requests (403 in console)

**Error Response Format**:
- API Gateway expects `{ message: string }` in Lambda error
- We throw errors like: `throw new Error("bad-request: Invalid input")`
- API Gateway extracts message, maps via regex to HTTP status codes

**Deployment Stages**:
- Each deployment creates new stage (dev, staging, prod)
- We use single 'prod' stage
- Stage changes URL: `https://<api-id>.execute-api.us-east-1.amazonaws.com/<stage>/`

**URL Changes on Stack Recreation**:
- Deleting/recreating stack generates new API Gateway ID
- URL changes from `9platxfqc3` to random new ID
- Must update ServerFacade.ts after redeployment

**Throttling**:
- Default: 10,000 requests/sec across all APIs in account
- Per-API: 5,000 requests/sec
- Burst: 5,000 requests
- Rate limit errors: 429 Too Many Requests

### IAM

**SAM Auto-Creates Roles**:
- One IAM role per Lambda function
- Named: `<StackName>-<FunctionName>Role-<RandomSuffix>`
- Policies attached based on resource access in template.yaml

**We Use *FullAccess (Development Only)**:
- `AmazonDynamoDBFullAccess`: All DynamoDB operations
- `AmazonS3FullAccess`: All S3 operations
- `AmazonSQSFullAccess`: All SQS operations
- **Production**: Should narrow to specific table/bucket ARNs (principle of least privilege)

**CAPABILITY_NAMED_IAM**:
- Required when creating IAM resources with custom names
- SAM includes this automatically in samconfig.toml
- Without it: `CREATE_FAILED: requires CAPABILITY_NAMED_IAM`

### Cost Management

**Always-On Costs**:
- DynamoDB provisioned capacity = continuous charge (even with 0 requests)
- Our config: ~$5-20/month (50 RCU + 55 RCU GSIs + 100 WCU)

**Free Tier Resources**:
- Lambda: 1M requests/month + 400,000 GB-seconds (covers typical development)
- API Gateway: 1M requests/month (first 12 months)
- DynamoDB: 25 RCU + 25 WCU + 25 GB storage (always free)
- S3: 5 GB storage + 20K GET + 2K PUT (first 12 months)
- SQS: 1M requests/month (always free)

**Avoiding Charges**:
- Delete stack when not in use: `sam delete --stack-name byu-cs340-tweeter-kevkp`
- Sets cost to $0/month (free tier never expires if resources don't exist)
- See: [Operations & Maintenance](#operations--maintenance)

**Cost Monitoring**:
- AWS Cost Explorer: Daily/monthly breakdown by service
- Billing Alerts: Email notification at threshold ($5, $10, etc.)
- Free tier usage: Billing console shows % of free tier used

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

## Future Improvements & Technical Debt

This section documents planned enhancements and known issues for when you return to the project. Prioritized by impact and effort.

### Immediate Improvements (Quick Wins)

**Lambda Function Naming Consistency**:
- **Issue**: 15+ functions use `lowerCamelCase` (non-AWS standard), 2 queue functions use `PascalCase`
- **Impact**: Inconsistent, violates AWS naming conventions
- **Effort**: Medium (rename in template.yaml, update ~30+ `!Ref` references, redeploy with resource replacement)
- **Risk**: Downtime during replacement, test thoroughly in non-prod
- **Benefit**: Professional codebase, easier handoff

**IAM Permission Tightening**:
- **Issue**: All Lambdas use `*FullAccess` policies (overly permissive)
- **Impact**: Security risk (principle of least privilege violated)
- **Effort**: Medium (specify table/bucket ARNs in template.yaml)
- **Example**: `arn:aws:dynamodb:us-east-1:*:table/user` instead of `*`
- **Benefit**: Production-ready security posture

**CloudWatch Alarms**:
- **Issue**: No alerts for throttling, errors, or cost spikes
- **Effort**: Low (add Alarms section to template.yaml)
- **Metrics to monitor**:
  - DynamoDB: `ProvisionedThroughputExceededException`
  - Lambda: Error rate > 5%
  - API Gateway: 5XX errors > 1%
  - Billing: Daily cost > $10
- **Benefit**: Catch issues before users notice

**Request/Response Logging**:
- **Issue**: Limited visibility into API requests for debugging
- **Effort**: Low (enable API Gateway access logs, add Lambda structured logging)
- **Benefit**: Faster debugging, better observability

### Performance Optimizations

**DynamoDB Auto-Scaling**:
- **Issue**: Provisioned capacity requires manual tuning, wastes money during low traffic
- **Solution**: Switch to on-demand or implement auto-scaling targets
- **Effort**: Low (change BillingMode in template.yaml)
- **Trade-off**: Slightly higher cost for on-demand, but simpler operations
- **Benefit**: No manual capacity planning, automatic scaling

**CloudFront CDN**:
- **Issue**: Frontend served from S3/local dev server (high latency for distant users)
- **Solution**: CloudFront distribution for static assets + API Gateway caching
- **Effort**: Medium (add CloudFront to template.yaml, update CORS)
- **Benefit**: Lower latency worldwide, reduced S3 costs

**Image Optimization**:
- **Issue**: Profile images uploaded at full resolution (~1-5MB)
- **Solution**: Lambda@Edge or separate Lambda to resize/compress on upload
- **Effort**: Medium (add image processing Lambda, Sharp library)
- **Target**: Max 200KB per image (compress to WebP, 400x400px)
- **Benefit**: Faster page loads, lower S3 storage costs

**Pagination Caching**:
- **Issue**: Fetching page 2 of followers re-queries already-seen page 1 data
- **Solution**: Cache paginated results in Redis or DynamoDB with TTL
- **Effort**: High (add Redis cluster or DynamoDB TTL table, update DAOs)
- **Benefit**: Faster pagination, reduced DynamoDB costs

### Feature Enhancements

**Real-Time Notifications**:
- **Use case**: Notify users when someone follows them, likes post, mentions them
- **Solution**: WebSocket API Gateway + Lambda for push notifications
- **Effort**: High (new API Gateway, connection management, client subscriptions)
- **Reference**: [AWS WebSocket API Tutorial](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api.html)

**Direct Messaging**:
- **Use case**: Private 1-on-1 conversations between users
- **Schema**: New `message` table (conversationId + timestamp sort key)
- **Effort**: High (new table, API endpoints, frontend UI)

**Search Functionality**:
- **Use case**: Search users by name/alias, search posts by content
- **Solution**: Amazon OpenSearch Service (managed Elasticsearch)
- **Effort**: High (OpenSearch cluster, indexing Lambda, search API)
- **Alternative**: DynamoDB Scan with FilterExpression (slow for large datasets)

**User Mentions & Hashtags**:
- **Use case**: Tag users (@username), organize posts by topic (#topic)
- **Schema**: Extract mentions/hashtags during post creation, store in GSI
- **Effort**: Medium (parsing logic, GSI on status table, notification trigger)

**Post Editing/Deletion**:
- **Use case**: Allow users to edit or delete their own posts
- **Current limitation**: Posts are immutable after creation
- **Effort**: Low (add edit timestamp, soft-delete flag, update API)
- **Complexity**: Invalidate cached feed entries (requires re-fanout or TTL)

### Testing Improvements

**E2E Tests with Playwright**:
- **Issue**: Only unit/integration tests, no full browser testing
- **Solution**: Playwright tests for critical flows (register → login → post → feed)
- **Effort**: Medium (setup Playwright, write test specs, add to CI)
- **Benefit**: Catch UI regressions, verify end-to-end functionality

**Load Testing**:
- **Issue**: Queue system tested manually with 10K followers, no automated load tests
- **Solution**: Artillery or Locust scripts for load testing
- **Scenarios**: 100 concurrent users posting simultaneously, 1K followers each
- **Effort**: Low (write load test script, run periodically)

**Lambda Integration Tests**:
- **Issue**: Lambdas only have unit tests (mocked DAOs), not integration tests
- **Solution**: Test Lambdas against real DynamoDB Local or test tables
- **Effort**: Medium (setup DynamoDB Local, seed test data, add test scripts)
- **Benefit**: Catch DAO bugs, verify DynamoDB queries

### Architectural Improvements

**EventBridge Instead of SQS**:
- **Issue**: SQS is point-to-point (one publisher → one consumer)
- **Solution**: EventBridge for pub/sub (one event → multiple subscribers)
- **Use case**: Post creation triggers feed cache, notifications, analytics
- **Effort**: Medium (replace SQS with EventBridge, add event schema)
- **Benefit**: Extensible for future features (don't modify existing code)

**CQRS for Feed**:
- **Issue**: Same data model for writes (posting) and reads (feed loading)
- **Solution**: Separate write model (status table) and read model (cachedFeed)
- **Current state**: Already partially implemented (cachedFeed is read model)
- **Enhancement**: Make it explicit, add read model synchronization service
- **Benefit**: Optimize each model independently

**Redis Cache Layer**:
- **Issue**: Hot data (popular users, trending posts) hits DynamoDB repeatedly
- **Solution**: ElastiCache Redis for caching user profiles, follower counts
- **Effort**: High (Redis cluster, cache invalidation strategy, update DAOs)
- **Benefit**: Lower DynamoDB costs, faster reads for hot data

**GraphQL Instead of REST**:
- **Issue**: REST requires multiple round-trips (get user, then get followers, then get their posts)
- **Solution**: GraphQL API for flexible, efficient queries
- **Effort**: Very High (rewrite API layer, add AppSync or Apollo Server)
- **Benefit**: Fewer round-trips, client controls data shape

### DevOps Enhancements

**CI/CD Pipeline**:
- **Issue**: Manual build and deployment process
- **Solution**: GitHub Actions workflow (test → build → deploy on push to main)
- **Effort**: Medium (write workflow YAML, configure AWS credentials)
- **Stages**: Lint → Test → Build → Deploy to dev → Integration test → Deploy to prod

**Multi-Environment Support**:
- **Issue**: Single 'prod' environment, no dev/staging
- **Solution**: Separate stacks per environment (dev, staging, prod)
- **Effort**: Medium (parameterize stack name, separate samconfig files)
- **Benefit**: Test changes safely before production

**Automated Backup/Restore**:
- **Issue**: No backup strategy for DynamoDB tables
- **Solution**: AWS Backup service or DynamoDB point-in-time recovery
- **Effort**: Low (enable PITR in template.yaml, or add Backup plan)
- **Benefit**: Recover from accidental deletions, compliance

**Infrastructure as Code (CDK)**:
- **Issue**: SAM template is verbose YAML (695 lines)
- **Solution**: AWS CDK (TypeScript) for type-safe, reusable infrastructure
- **Effort**: High (rewrite template.yaml in CDK)
- **Benefit**: Better abstractions, reusable constructs, type safety

### Known Bugs/Issues

**Feed Cache Message Loss (~1-5%)**:
- **Impact**: Some followers don't see new posts (acceptable for Twitter-like app)
- **Root cause**: DynamoDB throttling + batch write partial failures
- **Current mitigation**: Retry with exponential backoff (3 attempts)
- **Improvement**: Increase cachedFeed WCU or switch to on-demand billing

**Alias Validation Race Condition (~0.5%)**:
- **Impact**: Two concurrent registrations can claim same alias
- **Root cause**: Check-then-act race (not atomic)
- **Current mitigation**: Low probability, acceptable
- **Fix**: DynamoDB conditional write with alias as unique key

**No Graceful S3 Upload Failure Handling**:
- **Impact**: Registration fails if S3 upload fails (user gets error, account not created)
- **Current behavior**: Atomic (S3 fails → user record not created)
- **Improvement**: Decouple S3 upload (create user first, upload image async, default avatar)

**No Pagination for Large Result Sets**:
- **Issue**: Fetching 10,000 followers loads all into memory
- **Current mitigation**: Pagination exists (200/batch)
- **Improvement**: Stream processing for batch operations

**Session Tokens Not Refreshed**:
- **Issue**: 24-hour tokens expire, user kicked out mid-session
- **Solution**: Sliding expiration (refresh token on each request)
- **Effort**: Low (update SessionDAO to extend expiration on validation)

### References for Future Development

- [AWS Serverless Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [API Gateway Caching](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-caching.html)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [EventBridge Patterns](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html)
