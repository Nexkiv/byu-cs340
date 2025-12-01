import { useUserInfo, useUserInfoActions } from "../userInfo/UserInfoHooks";
import { useNavigate } from "react-router-dom";
import { useMessageActions } from "./MessageHooks";
import { useRef } from "react";
import {
  UserNavigationHookPresenter,
  UserNavigationHookView,
} from "../../presenter/UserNavigationHookPresenter";

export const useUserNavigation = (featurePath: string) => {
  const { displayErrorMessage } = useMessageActions();
  const { displayedUser, sessionToken } = useUserInfo();
  const { setDisplayedUser } = useUserInfoActions();

  const navigate = useNavigate();

  const view: UserNavigationHookView = {
    navigate: navigate,
    setDisplayedUser: setDisplayedUser,
    displayErrorMessage: displayErrorMessage,
  };

  const presenterRef = useRef<UserNavigationHookPresenter | null>(null);
  if (!presenterRef.current) {
    presenterRef.current = new UserNavigationHookPresenter(view);
  }

  const navigateToUser = async (event: React.MouseEvent): Promise<void> => {
    event.preventDefault();

    presenterRef.current!.navigateToUser(
      sessionToken!,
      event.target.toString(),
      displayedUser!,
      featurePath
    );
  };

  return {
    navigateToUser,
  };
};
