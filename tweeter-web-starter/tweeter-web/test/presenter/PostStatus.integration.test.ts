import { SessionToken, User, LoginRequest } from "tweeter-shared";
import { StatusService } from "../../src/model.service/StatusService";
import {
  PostStatusPresenter,
  PostStatusView,
} from "../../src/presenter/PostStatusPresenter";
import { ServerFacade } from "../../src/net/ServerFacade";
import { mock, instance, verify, anything } from "@typestrong/ts-mockito";
import "isomorphic-fetch";

describe("PostStatusPresenter Integration Test - Post and Verify in Story", () => {
  let serverFacade: ServerFacade;
  let statusService: StatusService;
  let postStatusPresenter: PostStatusPresenter;
  let mockView: PostStatusView;

  const TEST_ALIAS = "@allen";
  const TEST_PASSWORD = "password123";

  let loggedInUser: User | null = null;
  let sessionToken: SessionToken | null = null;
  let testStatusContent: string;

  beforeEach(() => {
    serverFacade = new ServerFacade();
    statusService = new StatusService();

    // Mock the PostStatusView interface
    mockView = mock<PostStatusView>();
    const mockViewInstance = instance(mockView);

    postStatusPresenter = new PostStatusPresenter(mockViewInstance);

    // Generate unique status content for each test run
    testStatusContent = `Integration test status - ${Date.now()}`;
  });

  test("should post status via presenter and verify it appears in user's story", async () => {
    // STEP 1: Login to get valid session token and user
    const loginRequest: LoginRequest = {
      alias: TEST_ALIAS,
      password: TEST_PASSWORD,
    };

    [loggedInUser, sessionToken] = await serverFacade.login(loginRequest);

    expect(loggedInUser).not.toBeNull();
    expect(sessionToken).not.toBeNull();
    expect(loggedInUser?.alias).toBe(TEST_ALIAS);

    if (!loggedInUser || !sessionToken) {
      fail("Login failed - cannot proceed with test");
    }

    // STEP 2: Submit post via PostStatusPresenter
    await postStatusPresenter.submitPost(
      testStatusContent,
      loggedInUser,
      sessionToken
    );

    // Brief wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 100));

    // STEP 3: Verify presenter displayed success message
    verify(mockView.displayInfoMessage("Status posted!", 2000)).once();
    verify(mockView.displayInfoMessage("Posting status...", 0)).once();
    verify(mockView.setPost("")).once();
    verify(mockView.displayErrorMessage(anything())).never();

    // STEP 4: Retrieve story to find the posted status
    const [storyStatuses] = await statusService.loadMoreStoryItems(
      sessionToken,
      loggedInUser.userId, // Use userId, not alias (per PagedItemRequest pattern)
      10,
      null
    );

    expect(Array.isArray(storyStatuses)).toBe(true);
    expect(storyStatuses.length).toBeGreaterThan(0);

    // STEP 5: Verify our posted status appears in the story
    const postedStatus = storyStatuses.find(
      (status) => status.contents === testStatusContent
    );

    expect(postedStatus).toBeDefined();

    if (!postedStatus) {
      fail(`Posted status not found in story. Content: "${testStatusContent}"`);
    }

    // Verify status properties
    expect(postedStatus.userId).toBe(loggedInUser.userId);
    expect(postedStatus.contents).toBe(testStatusContent);
    expect(postedStatus.statusId).toBeDefined();
    expect(postedStatus.postTime).toBeGreaterThan(0);

    // Verify user hydration
    expect(postedStatus.user).toBeDefined();
    expect(postedStatus.user?.userId).toBe(loggedInUser.userId);
    expect(postedStatus.user?.alias).toBe(loggedInUser.alias);

    // Verify postTime is recent (within last 10 seconds)
    const currentTime = Date.now();
    const timeDifference = currentTime - postedStatus.postTime;
    expect(timeDifference).toBeLessThan(10000);
    expect(timeDifference).toBeGreaterThanOrEqual(0);
  }, 15000); // 15 second timeout for entire test
});
