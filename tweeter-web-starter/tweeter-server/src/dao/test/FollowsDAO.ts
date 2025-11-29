// FollowsDAO.ts
import { Follow } from "../../entity/Follow";
import { DataPage } from "../../entity/DataPage";

export interface FollowsDAO {
  getFollow(follow: Follow): Promise<Follow | undefined>;
  putFollow(follow: Follow): Promise<void>;
  deleteFollow(follow: Follow): Promise<void>;
  getPageOfFollowees(
    followerHandle: string,
    pageSize?: number,
    lastFolloweeHandle?: string
  ): Promise<DataPage<Follow>>;
  getPageOfFollowers(
    followeeHandle: string,
    pageSize?: number,
    lastFolloweeHandle?: string
  ): Promise<DataPage<Follow>>;
  updateFollowNames(
    follower_handle: string,
    followee_handle: string,
    follower_name?: string,
    followee_name?: string
  ): Promise<void>;
}
