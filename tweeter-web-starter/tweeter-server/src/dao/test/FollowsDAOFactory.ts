// FollowsDAOFactory.ts
import { FollowsDAO } from "./FollowsDAO";
import { DynamoDBFollowsDAO } from "./DynamoDBFollowsDAO";

export class FollowsDAOFactory {
  static create(type: "dynamo"): FollowsDAO {
    switch (type) {
      case "dynamo":
        return new DynamoDBFollowsDAO();
      default:
        throw new Error("Unsupported DAO type");
    }
  }
}
