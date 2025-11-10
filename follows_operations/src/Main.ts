import { Follow } from "./entity/Follow";
import { FollowsDAO } from "./dao/FollowsDAO";

const handles = [
  "@DonaldDuck",
  "@HueyDuck",
  "@DeweyDuck",
  "@LouieDuck",
  "@DellaDuck",
  "@LudwigVonDrake",
  "@MatildaDuck",
  "@GladstoneGander",
  "@FethryDuck",
  "@AbnerDuck",
  "@GusGoose",
  "@ScroogeMcDuck",
  "@HortenseMcDuck",
  "@QuackmoreDuck",
  "@GoostaveGander",
  "@DaphneDuck",
  "@LulubelleLoon",
  "@EiderDuck",
  "@FannyCoot",
  "@LukeGoose",
  "@CuthbertCoot",
  "@DownyODrake",
  "@FergusMcDuck",
  "@HumperdinkDuck",
  "@ElviraCoot",
];

const names = [
  "Donald Duck",
  "Huey Duck",
  "Dewey Duck",
  "Louie Duck",
  "Della Duck",
  "Ludwig VonDrake",
  "Matilda Duck",
  "Gladstone Gander",
  "Fethry Duck",
  "Abner Duck",
  "Gus Goose",
  "Scrooge McDuck",
  "Hortense McDuck",
  "Quackmore Duck",
  "Goostave Gander",
  "Daphne Duck",
  "Lulubelle Loon",
  "Eider Duck",
  "Fanny Coot",
  "Luke Goose",
  "Cuthbert Coot",
  "Downy O'Drake",
  "Fergus McDuck",
  "Humperdink Duck",
  "Elvira Coot",
];

const specificHandle = "@MarkBeaks";
const specificName = "Marcus Beaks";
const PAGE_LENGTH = 2;

const specificFollow = new Follow(specificHandle, "@DonaldDuck");

class Main {
  async run() {
    const followsDao = new FollowsDAO();

    // // “Put” 25 items into the “follows” table all with the same follower:
    // for (let i = 0; i < handles.length; i++) {
    //   await followsDao.putFollow(
    //     new Follow(specificHandle, handles.at(i)!, specificName, names.at(i)!)
    //   );
    // }

    // // "Put" 25 more items into the "follows" table, this time all with the same followee:
    // for (let i = 0; i < handles.length; i++) {
    //   await followsDao.putFollow(
    //     new Follow(handles.at(i)!, specificHandle, names.at(i)!, specificName)
    //   );
    // }

    // // “Get” one of the items from the “follows” table using its primary key
    // let follow = await followsDao.getFollow(specificFollow);
    // if (!!follow) {
    //   console.log(follow.toString());
    // } else {
    //   console.error("Error: Unable to read in follow information.");
    // }

    // // “Update” the “follower_name” and “followee_name” attributes of one of the items in the “follows” table
    // await followsDao.updateFollowNames(
    //   specificHandle,
    //   "@DonaldDuck",
    //   "Mark Beaks",
    //   "The Real Donald Duck"
    // );

    // follow = await followsDao.getFollow(specificFollow);
    // if (!!follow) {
    //   console.log(follow.toString());
    // } else {
    //   console.error("Error: Unable to read in follow information.");
    // }

    // // “Delete” one of the items in the “follows” table using its primary key
    // const scroogeFollow = new Follow("@ScroogeMcDuck", specificHandle);
    // await followsDao.deleteFollow(scroogeFollow);
    // follow = await followsDao.getFollow(scroogeFollow);
    // if (!!follow) {
    //   console.error("Error: Unable to remove the follow relationship.");
    // } else {
    //   console.log("Successfully removed the follow relationship.");
    // }

    // console.log("\n\n");

    // Calls method to get the first and second pages of followees of a specified follower
    let followeeData = await followsDao.getPageOfFollowees(specificHandle, 2);
    if (!!followeeData) {
      console.log("Page 1:");
      console.log(followeeData);
    } else {
      console.error(
        "Error: Unable to get the first page of followees of a specified follower."
      );
    }
    if (followeeData.hasMorePages) {
      followeeData = await followsDao.getPageOfFollowees(
        specificHandle,
        PAGE_LENGTH,
        followeeData.values[PAGE_LENGTH - 1]!.followee_handle
      );
      if (!!followeeData) {
        console.log("Page 2:");
        console.log(followeeData);
      } else {
        console.error(
          "Error: Unable to get the second page of followees of a specified follower."
        );
      }
    } else {
      console.error(
        "Error: Unable to get the second page of followers of a specified followee."
      );
    }

    console.log("\n\n");

    // Calls method to get the first and second pages of followers of a specified followee
    let followerData = await followsDao.getPageOfFollowers(specificHandle, 2);
    if (!!followerData) {
      console.log("Page 1:");
      console.log(followerData);
    } else {
      console.error(
        "Error: Unable to get the first page of followers of a specified followee."
      );
    }
    if (followerData.hasMorePages) {
      followerData = await followsDao.getPageOfFollowers(
        specificHandle,
        PAGE_LENGTH,
        followerData.values[PAGE_LENGTH - 1]!.follower_handle
      );
      if (!!followerData) {
        console.log("Page 2:");
        console.log(followerData);
      } else {
        console.error(
          "Error: Unable to get the second page of followers of a specified followee."
        );
      }
    } else {
      console.error(
        "Error: Unable to get the second page of followers of a specified followee."
      );
    }
  }
}

function run() {
  new Main().run();
}

run();
