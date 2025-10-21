import { MemoryRouter } from "react-router-dom";
import Login from "../../../../src/components/authentication/login/Login";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { library } from "@fortawesome/fontawesome-svg-core";
import { fab } from "@fortawesome/free-brands-svg-icons";
import "@testing-library/jest-dom";
import { LoginPresenter } from "../../../../src/presenter/authentication/LoginPresenter";
import { instance, mock, verify } from "@typestrong/ts-mockito";

library.add(fab);

const testOriginalUrl: string | undefined = "/";
const testAlias = "@alias";
const testPassword = "myPassword";

describe("Login Component", () => {
  test("starts with the sign in button disabled", () => {
    const { signInButton } = renderLoginAndGetElements("/");
    expect(signInButton).toBeDisabled();
  });

  test("enables the sign in button if both alias and sign password fields have text", async () => {
    const { signInButton, aliasField, passwordField, user } =
      renderLoginAndGetElements(testOriginalUrl);

    await user.type(aliasField, testAlias);
    await user.type(passwordField, testPassword);
    expect(signInButton).toBeEnabled();
  });

  test("disables the sign in button if either the alias or password field is cleared", async () => {
    const { signInButton, aliasField, passwordField, user } =
      renderLoginAndGetElements(testOriginalUrl);

    await user.type(aliasField, testAlias);
    await user.type(passwordField, testPassword);
    expect(signInButton).toBeEnabled();

    await user.clear(aliasField);
    expect(signInButton).toBeDisabled();

    await user.type(aliasField, testAlias);
    expect(signInButton).toBeEnabled();

    await user.clear(aliasField);
    expect(signInButton).toBeDisabled();
  });

  test("calls the presenter's login parameters with correct parameters when the sign in button is pressed", async () => {
    const mockPresenter = mock<LoginPresenter>();
    const mockPresenterInstance = instance(mockPresenter);

    const { signInButton, aliasField, passwordField, user } =
      renderLoginAndGetElements(testOriginalUrl, mockPresenterInstance);

    await user.type(aliasField, testAlias);
    await user.type(passwordField, testPassword);
    await user.click(signInButton);

    verify(mockPresenter.doLogin(testAlias, testPassword, false)).once();
  });
});

function renderLogin(originalUrl?: string, presenter?: LoginPresenter) {
  return render(
    <MemoryRouter>
      <Login originalUrl={originalUrl} presenter={presenter} />
    </MemoryRouter>
  );
}

function renderLoginAndGetElements(
  originalUrl?: string,
  presenter?: LoginPresenter
) {
  const user = userEvent.setup();

  renderLogin(originalUrl, presenter);

  const signInButton = screen.getByRole("button", { name: /Sign in/i });
  const aliasField = screen.getByLabelText("alias");
  const passwordField = screen.getByLabelText("password");

  return { user, signInButton, aliasField, passwordField };
}
