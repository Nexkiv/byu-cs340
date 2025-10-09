import { useContext } from "react";
import { UserInfoActionsContext, UserInfoContext } from "./UserInfoContexts";

export const useUserInfoActions = () => {
  return useContext(UserInfoActionsContext);
};

export const useUserInfo = () => {
  return useContext(UserInfoContext);
};
