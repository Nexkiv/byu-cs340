import { useUserInfo, useUserInfoActions } from "../userInfo/UserInfoHooks";
import { useNavigate } from "react-router-dom";
import { useMessageActions } from "./MessageHooks";
import { useRef } from "react";
import { UserNavigationHookPresenter } from "../../presenter/UserNavigationHookPresenter";

export const useUserNavigation = (featurePath: string) => {
  const { displayErrorMessage } = useMessageActions();
  const { displayedUser, authToken } = useUserInfo();
  const { setDisplayedUser } = useUserInfoActions();

  const presenterRef = useRef<UserNavigationHookPresenter | null>(null);
  if (!presenterRef.current) {
    presenterRef.current = new UserNavigationHookPresenter();
  }

  const navigate = useNavigate();

  const navigateToUser = async (event: React.MouseEvent): Promise<void> => {
    event.preventDefault();

    try {
      const alias = extractAlias(event.target.toString());

      const toUser = await presenterRef.current!.getUser(authToken!, alias);

      if (toUser) {
        if (!toUser.equals(displayedUser!)) {
          setDisplayedUser(toUser);
          navigate(`${featurePath}/${toUser.alias}`);
        }
      }
    } catch (error) {
      displayErrorMessage(`Failed to get user because of exception: ${error}`);
    }
  };

  const extractAlias = (value: string): string => {
    const index = value.indexOf("@");
    return value.substring(index);
  };

  return {
    navigateToUser,
  };
};
