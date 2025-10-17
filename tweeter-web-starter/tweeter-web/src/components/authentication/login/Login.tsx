import "./Login.css";
import "bootstrap/dist/css/bootstrap.css";
import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthenticationFormLayout from "../AuthenticationFormLayout";
import AuthenticationFields from "../shared/AuthenticationFields";
import { useMessageActions } from "../../hooks/MessageHooks";
import { useUserInfoActions } from "../../userInfo/UserInfoHooks";
import {
  LoginView,
  LoginPresenter,
} from "../../../presenter/authentication/LoginPresenter";

interface Props {
  originalUrl?: string;
}

const Login = (props: Props) => {
  const [alias, setAlias] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { updateUserInfo } = useUserInfoActions();
  const { displayErrorMessage } = useMessageActions();

  const view: LoginView = {
    setIsLoading: setIsLoading,
    navigate: navigate,
    updateUserInfo: updateUserInfo,
    displayErrorMessage: displayErrorMessage,
  };

  const presenterRef = useRef<LoginPresenter | null>(null);
  if (!presenterRef.current) {
    presenterRef.current = new LoginPresenter(view, props.originalUrl);
  }

  const loginOnEnter = (event: React.KeyboardEvent<HTMLElement>) => {
    if (
      event.key == "Enter" &&
      !presenterRef.current!.checkSubmitButtonStatus(alias, password)
    ) {
      presenterRef.current!.doLogin(alias, password, rememberMe);
    }
  };

  const inputFieldFactory = () => {
    return (
      <>
        <AuthenticationFields
          setAlias={setAlias}
          setPassword={setPassword}
          onEnter={loginOnEnter}
        />
      </>
    );
  };

  const switchAuthenticationMethodFactory = () => {
    return (
      <div className="mb-3">
        Not registered? <Link to="/register">Register</Link>
      </div>
    );
  };

  return (
    <AuthenticationFormLayout
      headingText="Please Sign In"
      submitButtonLabel="Sign in"
      oAuthHeading="Sign in with:"
      inputFieldFactory={inputFieldFactory}
      switchAuthenticationMethodFactory={switchAuthenticationMethodFactory}
      setRememberMe={setRememberMe}
      submitButtonDisabled={() =>
        presenterRef.current!.checkSubmitButtonStatus(alias, password)
      }
      isLoading={isLoading}
      submit={() => presenterRef.current!.doLogin(alias, password, rememberMe)}
    />
  );
};

export default Login;
