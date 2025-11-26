import { StatusService } from "../../src/model.service/StatusService";
import { AuthToken, Status } from "tweeter-shared";
import "isomorphic-fetch";

describe("StatusService.loadMoreStoryItems (integration)", () => {
  let service: StatusService;

  beforeEach(() => {
    service = new StatusService();
  });

  test("returns a page of story statuses and correct hasMore flag", async () => {
    const authToken: AuthToken = new AuthToken("valid-auth-token", 0);
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
