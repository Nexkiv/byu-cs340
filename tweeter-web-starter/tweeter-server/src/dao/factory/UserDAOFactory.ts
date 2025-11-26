// UserDAOFactory.ts
import { UserDAO } from "../interface/UserDAO";
import { DynamoDBUserDAO } from "../dynamo/DynamoDBUserDAO";

export class FollowsDAOFactory {
  static create(type: "dynamo"): UserDAO {
    switch (type) {
      case "dynamo":
        return new DynamoDBUserDAO();
      default:
        throw new Error("Unsupported DAO type");
    }
  }
}
