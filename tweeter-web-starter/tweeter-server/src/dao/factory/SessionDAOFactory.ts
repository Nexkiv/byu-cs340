import { SessionDAO } from "../interface/SessionDAO";
import { DynamoDBSessionDAO } from "../dynamo/DynamoDBSessionDAO";

export class SessionDAOFactory {
  static create(type: "dynamo"): SessionDAO {
    switch (type) {
      case "dynamo":
        return new DynamoDBSessionDAO();
      default:
        throw new Error("Unsupported DAO type");
    }
  }
}
