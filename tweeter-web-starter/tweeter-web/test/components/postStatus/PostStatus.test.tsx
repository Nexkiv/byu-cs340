import { MemoryRouter } from "react-router-dom";
import PostStatus from "../../../src/components/postStatus/PostStatus";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { userEvent } from "@testing-library/user-event";
import { useUserInfo } from "../../../src/components/userInfo/UserInfoHooks";
import { AuthToken, User } from "tweeter-shared";
import {
  anything,
  instance,
  mock,
  verify,
  deepEqual,
} from "@typestrong/ts-mockito";
import { PostStatusPresenter } from "../../../src/presenter/PostStatusPresenter";

const testStatusText = "Hello World!";

jest.mock("../../../src/components/userInfo/UserInfoHooks", () => ({
  ...jest.requireActual("../../../src/components/userInfo/UserInfoHooks"),
  __esModule: true,
  useUserInfo: jest.fn(),
}));

describe("PostStatus Component", () => {
  // TODO: change these to be actual user and authtokens
  const mockUserInstance = mock<User>();
  const mockAuthTokenInstance = mock<AuthToken>();

  beforeAll(() => {
    (useUserInfo as jest.Mock).mockReturnValue({
      currentUser: mockUserInstance,
      authToken: mockAuthTokenInstance,
    });
  });

  test("starts with the Post Status and Clear buttons disabled", () => {
    const { postStatusButton, clearButton } = renderPostStatusAndGetElements();
    expect(postStatusButton).toBeDisabled();
    expect(clearButton).toBeDisabled();
  });

  test("enables Post Status and Clear buttons if status text field has text", async () => {
    const { user, postStatusButton, clearButton, textField } =
      renderPostStatusAndGetElements();

    await user.type(textField, testStatusText);
    expect(postStatusButton).toBeEnabled();
    expect(clearButton).toBeEnabled();
  });

  test("disables Post Status and Clear buttons if the status text field is cleared", async () => {
    const { user, postStatusButton, clearButton, textField } =
      renderPostStatusAndGetElements();

    await user.type(textField, testStatusText);
    expect(postStatusButton).toBeEnabled();
    expect(clearButton).toBeEnabled();

    await user.clear(textField);
    expect(postStatusButton).toBeDisabled();
    expect(clearButton).toBeDisabled();
  });

  test("calls the presenter's postStatus method when the Post Status button is pressed", async () => {
    const mockPresenter = mock<PostStatusPresenter>();
    const mockPresenterInstance = instance(mockPresenter);

    const { user, postStatusButton, textField } =
      renderPostStatusAndGetElements(mockPresenterInstance);

    await user.type(textField, testStatusText);
    await user.click(postStatusButton);

    verify(
      mockPresenter.submitPost(
        testStatusText,
        deepEqual(mockUserInstance),
        deepEqual(mockAuthTokenInstance)
      )
    ).once();
  });
});

function renderPostStatus(presenter?: PostStatusPresenter) {
  return render(<PostStatus presenter={presenter} />);
}

function renderPostStatusAndGetElements(presenter?: PostStatusPresenter) {
  const user = userEvent.setup();

  renderPostStatus(presenter);

  const postStatusButton = screen.getByRole("button", { name: /Post Status/ });
  const clearButton = screen.getByRole("button", { name: /Clear/ });
  const textField = screen.getByLabelText("postStatusText");

  return { user, postStatusButton, clearButton, textField };
}
