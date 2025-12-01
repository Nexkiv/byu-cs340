import { FeedCacheDAO } from "../interface/FeedCacheDAO";
import { DynamoDBFeedCacheDAO } from "../dynamo/DynamoDBFeedCacheDAO";

export class FeedCacheDAOFactory {
  static create(type: "dynamo"): FeedCacheDAO {
    switch (type) {
      case "dynamo":
        return new DynamoDBFeedCacheDAO();
      default:
        throw new Error("Unsupported DAO type");
    }
  }
}
