import { SessionToken, Status, User } from "tweeter-shared";
import { StatusService } from "../../src/model.service/StatusService";
import {
  PostStatusPresenter,
  PostStatusView,
} from "../../src/presenter/PostStatusPresenter";
import {
  mock,
  instance,
  when,
  anything,
  spy,
  verify,
  capture,
} from "@typestrong/ts-mockito";

describe("PostStatusPresenter", () => {
  let mockPostStatusPresenterView: PostStatusView;
  let postStatusPresenter: PostStatusPresenter;
  let mockService: StatusService;

  const authToken = new SessionToken("abc123", "test-user-123", Date.now());
  const postText = "Hello World!";
  const testUser = new User("test-user-123", "John", "Doe", "john123", "fake_url.png", 0, 0);
  const testMsgId = "messageId123";

  beforeEach(() => {
    mockPostStatusPresenterView = mock<PostStatusView>();
    const mockPostStatusPresenterViewInstance = instance(
      mockPostStatusPresenterView
    );
    when(
      mockPostStatusPresenterView.displayInfoMessage(anything(), 0)
    ).thenReturn(testMsgId);

    const postStatusPresenterSpy = spy(
      new PostStatusPresenter(mockPostStatusPresenterViewInstance)
    );
    postStatusPresenter = instance(postStatusPresenterSpy);

    mockService = mock<StatusService>();
    when(postStatusPresenterSpy.service).thenReturn(instance(mockService));
  });

  test("tells the view to display a posting status message", async () => {
    await postStatusPresenter.submitPost(postText, testUser, authToken);
    verify(
      mockPostStatusPresenterView.displayInfoMessage("Posting status...", 0)
    ).once();
  });

  test("calls postStatus on the post status service with the correct status string and auth token", async () => {
    await postStatusPresenter.submitPost(postText, testUser, authToken);

    let [capturedAuthToken, capturedStatus] = capture(
      mockService.postStatus
    ).last();
    expect(capturedAuthToken).toEqual(authToken);
    expect(capturedStatus.post).toEqual(postText);
  });

  test("tells the view to clear the info message that was displayed previously,\
    \n\t\t\t clear the post, and display a status posted message when successful", async () => {
    await postStatusPresenter.submitPost(postText, testUser, authToken);
    verify(mockPostStatusPresenterView.displayErrorMessage(anything())).never();
    verify(mockPostStatusPresenterView.deleteMessage(testMsgId)).once();
    verify(mockPostStatusPresenterView.setPost("")).once();
    verify(
      mockPostStatusPresenterView.displayInfoMessage("Status posted!", 2000)
    ).once();
  });

  test("tells the view to clear the info message and display an error message but does not\
    \n\t\t\t tell it to clear the post or display a status posted message when not successful", async () => {
    let error = new Error("An error occured");
    when(mockService.postStatus(anything(), anything())).thenThrow(error);
    await postStatusPresenter.submitPost(postText, testUser, authToken);

    verify(mockPostStatusPresenterView.deleteMessage(testMsgId)).once();
    verify(
      mockPostStatusPresenterView.displayErrorMessage(
        `Failed to post the status because of exception: ${error}`
      )
    ).once();
    verify(mockPostStatusPresenterView.setPost("")).never();
    verify(
      mockPostStatusPresenterView.displayInfoMessage("Status posted!", 2000)
    ).never();
  });
});
