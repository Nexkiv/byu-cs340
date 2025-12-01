import { useCallback, useMemo, useState } from "react";
import { User, SessionToken } from "tweeter-shared";
import { UserInfoContext, UserInfoActionsContext } from "./UserInfoContexts";
import { UserInfo } from "./UserInfo";

const CURRENT_USER_KEY: string = "CurrentUserKey";
const AUTH_TOKEN_KEY: string = "AuthTokenKey";

interface Props {
  children: React.ReactNode;
}

const UserInfoProvider: React.FC<Props> = ({ children }) => {
  const saveToLocalStorage = (
    currentUser: User,
    sessionToken: SessionToken
  ): void => {
    localStorage.setItem(CURRENT_USER_KEY, currentUser.toJson());
    localStorage.setItem(AUTH_TOKEN_KEY, sessionToken.toJson());
  };

  const retrieveFromLocalStorage = (): UserInfo => {
    const loggedInUser = User.fromJson(localStorage.getItem(CURRENT_USER_KEY));
    const sessionToken = SessionToken.fromJson(localStorage.getItem(AUTH_TOKEN_KEY));

    if (!!loggedInUser && !!sessionToken) {
      return {
        currentUser: loggedInUser,
        displayedUser: loggedInUser,
        sessionToken: sessionToken,
      };
    } else {
      return { currentUser: null, displayedUser: null, sessionToken: null };
    }
  };

  const clearLocalStorage = (): void => {
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
  };

  const [userInfo, setUserInfo] = useState({
    ...retrieveFromLocalStorage(),
  });

  const updateUserInfo = useCallback(
    (
      currentUser: User,
      displayedUser: User | null,
      sessionToken: SessionToken,
      remember: boolean = false
    ) => {
      setUserInfo(() => {
        return {
          currentUser: currentUser,
          displayedUser: displayedUser,
          sessionToken: sessionToken,
        };
      });

      if (remember) {
        saveToLocalStorage(currentUser, sessionToken);
      }
    },
    []
  );

  const clearUserInfo = useCallback(() => {
    setUserInfo(() => {
      return {
        currentUser: null,
        displayedUser: null,
        sessionToken: null,
      };
    });

    clearLocalStorage();
  }, []);

  const setDisplayedUser = useCallback((user: User) => {
    setUserInfo((previous) => {
      return { ...previous, displayedUser: user };
    });
  }, []);

  const userInfoActions = useMemo(
    () => ({
      updateUserInfo,
      clearUserInfo,
      setDisplayedUser,
    }),
    [updateUserInfo, clearUserInfo, setDisplayedUser]
  );

  return (
    <UserInfoContext.Provider value={userInfo}>
      <UserInfoActionsContext.Provider value={userInfoActions}>
        {children}
      </UserInfoActionsContext.Provider>
    </UserInfoContext.Provider>
  );
};

export default UserInfoProvider;
