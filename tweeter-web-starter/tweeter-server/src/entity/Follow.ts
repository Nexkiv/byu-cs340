export class Follow {
  follower_alias: string;
  followee_alias: string;
  follower_name?: string;
  followee_name?: string;

  constructor(
    follower_alias: string,
    followee_alias: string,
    follower_name?: string,
    followee_name?: string
  ) {
    this.follower_alias = follower_alias;
    this.followee_alias = followee_alias;
    if (!!follower_name) {
      this.follower_name = follower_name;
    }
    if (!!followee_name) {
      this.followee_name = followee_name;
    }
  }

  toString(): string {
    return (
      "Follow{" +
      "follower_alias='" +
      this.follower_alias +
      "'" +
      ", follower_name='" +
      this.follower_name +
      "'" +
      ", followee_alias='" +
      this.followee_alias +
      "'" +
      ", followee_name='" +
      this.followee_name +
      "'" +
      "}"
    );
  }
}
