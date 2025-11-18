import { ServerFacade } from "../../../src/net/ServerFacade";
import { PagedUserItemRequest } from "tweeter-shared";
import "isomorphic-fetch";

describe("ServerFacade GetFollowers Integration", () => {
  let facade: ServerFacade;

  beforeEach(() => {
    facade = new ServerFacade();
  });

  test("gets a page of followers and hasMore flag", async () => {
    const request: PagedUserItemRequest = {
      token: "valid-auth-token",
      alias: "@existingUser",
      pageSize: 10,
      lastItem: null,
    };

    const [followers, hasMore] = await facade.getMoreFollowers(request);

    expect(Array.isArray(followers)).toBe(true);
    followers.forEach((f) => {
      expect(f).toHaveProperty("alias");
      expect(f).toHaveProperty("firstName");
      expect(f).toHaveProperty("lastName");
      expect(f).toHaveProperty("imageUrl");
    });
    expect(typeof hasMore).toBe("boolean");
  });
});
