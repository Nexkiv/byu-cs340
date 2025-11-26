// StatusDAOFactory.ts
import { StatusDAO } from "../interface/StatusDAO";
import { DynamoDBStatusDAO } from "../dynamo/DynamoDBStatusDAO";

export class FollowsDAOFactory {
  static create(type: "dynamo"): StatusDAO {
    switch (type) {
      case "dynamo":
        return new DynamoDBStatusDAO();
      default:
        throw new Error("Unsupported DAO type");
    }
  }
}
