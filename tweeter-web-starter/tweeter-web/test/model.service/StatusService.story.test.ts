import { StatusService } from "../../src/model.service/StatusService";
import { SessionToken, Status } from "tweeter-shared";
import "isomorphic-fetch";

describe("StatusService.loadMoreStoryItems (integration)", () => {
  let service: StatusService;

  beforeEach(() => {
    service = new StatusService();
  });

  test("returns a page of story statuses and correct hasMore flag", async () => {
    const authToken: SessionToken = new SessionToken("valid-auth-token", "test-user-id", Date.now() + 86400000);
    const alias = "@existingUser";
    const pageSize = 10;
    const lastStatus: Status | null = null; // first page

    const [statuses, hasMore] = await service.loadMoreStoryItems(
      authToken,
      alias,
      pageSize,
      lastStatus
    );

    // Test type and structure
    expect(Array.isArray(statuses)).toBe(true);
    expect(typeof hasMore).toBe("boolean");
    expect(statuses.length).toBe(10);
  });
});
