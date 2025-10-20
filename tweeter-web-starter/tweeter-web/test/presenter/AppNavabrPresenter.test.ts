import { AuthToken } from "tweeter-shared";
import {
  AppNavbarPresenter,
  AppNavbarView,
} from "../../src/presenter/AppNavbarPresenter";
import {
  anything,
  capture,
  instance,
  mock,
  spy,
  verify,
  when,
} from "@typestrong/ts-mockito";
import { UserService } from "../../src/model.service/UserService";

describe("AppNavbarPresenter", () => {
  let mockAppNavbarPresenterView: AppNavbarView;
  let appNavbarPresenter: AppNavbarPresenter;
  let mockService: UserService;

  const authToken = new AuthToken("abc123", Date.now());

  beforeEach(() => {
    mockAppNavbarPresenterView = mock<AppNavbarView>();
    const mockAppNavbarPresenterViewInstance = instance(
      mockAppNavbarPresenterView
    );
    when(
      mockAppNavbarPresenterView.displayInfoMessage(anything(), 0)
    ).thenReturn("messageId123");

    const appNavbarPresenterSpy = spy(
      new AppNavbarPresenter(mockAppNavbarPresenterViewInstance)
    );
    appNavbarPresenter = instance(appNavbarPresenterSpy);

    mockService = mock<UserService>();
    when(appNavbarPresenterSpy.service).thenReturn(instance(mockService));
  });

  test("tells the view to display a logging out message", async () => {
    await appNavbarPresenter.logOut(authToken);
    verify(
      mockAppNavbarPresenterView.displayInfoMessage("Logging Out...", 0)
    ).once();
  });

  test("calls logout on the user service with the correct auth token", async () => {
    await appNavbarPresenter.logOut(authToken);
    verify(mockService.logout(authToken)).once();

    // let [capturedAuthToken] = capture(mockService.logout()).last();
    // expect(capturedAuthToken).toEqual(authToken);
  });

  test("tells the view to clear the info message that was displayed previously,\
    \n\t\t\t clear the user info, and navigate to the login page when successful", async () => {
    await appNavbarPresenter.logOut(authToken);
    verify(mockAppNavbarPresenterView.displayErrorMessage(anything())).never();
    verify(mockAppNavbarPresenterView.deleteMessage("messageId123")).once();
    verify(mockAppNavbarPresenterView.clearUserInfo()).once();
    verify(mockAppNavbarPresenterView.navigate("/login")).once();
  });

  test("tells the view to display an error message and does not tell it to clear the info message,\
    \n\t\t\t clear the user info or navigate to the login page when not successful", async () => {
    let error = new Error("An error occured");
    when(mockService.logout(anything())).thenThrow(error);
    await appNavbarPresenter.logOut(authToken);

    // let [errorString] = capture(
    //   mockAppNavbarPresenterView.displayErrorMessage
    // ).last();
    // console.log(errorString);

    verify(
      mockAppNavbarPresenterView.displayErrorMessage(
        `Failed to log user out because of exception: ${error}`
      )
    ).once();
    verify(mockAppNavbarPresenterView.deleteMessage(anything())).never();
    verify(mockAppNavbarPresenterView.clearUserInfo()).never();
    verify(mockAppNavbarPresenterView.navigate("/login")).never();
  });
});
