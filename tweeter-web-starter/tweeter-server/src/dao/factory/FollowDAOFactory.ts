// FollowDAOFactory.ts
import { FollowDAO } from "../interface/FollowDAO";
import { DynamoDBFollowDAO } from "../dynamo/DynamoDBFollowDAO";

export class FollowDAOFactory {
  static create(type: "dynamo"): FollowDAO {
    switch (type) {
      case "dynamo":
        return new DynamoDBFollowDAO();
      default:
        throw new Error("Unsupported DAO type");
    }
  }
}
