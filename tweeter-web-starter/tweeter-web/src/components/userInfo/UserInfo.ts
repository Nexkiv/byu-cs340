import { User, SessionToken } from "tweeter-shared";

export interface UserInfo {
  currentUser: User | null;
  displayedUser: User | null;
  sessionToken: SessionToken | null;
}
