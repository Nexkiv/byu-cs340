// StatusDAOFactory.ts
import { StatusDAO } from "../interface/StatusDAO";
import { DynamoDBStatusDAO } from "../dynamo/DynamoDBStatusDAO";

export class StatusDAOFactory {
  static create(type: "dynamo"): StatusDAO {
    switch (type) {
      case "dynamo":
        return new DynamoDBStatusDAO();
      default:
        throw new Error("Unsupported DAO type");
    }
  }
}
