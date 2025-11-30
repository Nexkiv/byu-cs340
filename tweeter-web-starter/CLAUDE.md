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
├── factory/FooDAOFactory.ts     # Factory for creating DAOs
└── test/TestFooDAO.ts           # In-memory test implementation
```

**Always use factories:**
```typescript
// Correct
const dao = FooDAOFactory.getInstance().getFooDAO();

// Wrong - don't do this
const dao = new DynamoDBFooDAO();
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

**Naming Convention:** All DynamoDB attributes use camelCase (e.g., `followerUserId`, not `follower_user_id`)

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

## Key Files

### Configuration
- `tweeter-server/template.yaml` - SAM template (Lambda functions, DynamoDB tables)
- `tweeter-server/api.yaml` - OpenAPI spec for API Gateway
- `tweeter-server/samconfig.toml` - SAM deployment settings

### Entry Points
- `tweeter-web/src/App.tsx` - React app routes and layout
- `tweeter-web/src/net/ServerFacade.ts` - All API calls go through here
- `tweeter-server/src/lambda/` - Lambda handler entry points organized by domain

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
- Services throw descriptive errors
- Lambda handlers catch and return proper HTTP responses
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

# Populate 44 active follow relationships
npm run populate-test-follows

# Create follow history (follow + unfollow for testing soft-delete)
npm run populate-test-follow-history
```

**Note:** Run populate-test-follow-history separately from populate-test-follows to allow natural time delays for GSI propagation.
- update claud.md with recent changes