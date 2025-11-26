import { AuthDataDAO } from "../interface/AuthDataDAO";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid"; // for secure random token

export class DynamoDBAuthDataDAO implements AuthDataDAO {
  private tableName = "authTokens";
  private client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  // Token expiration length in ms (e.g., 24 hours)
  private static EXPIRE_AFTER = 24 * 60 * 60 * 1000;

  async createAuthToken(userAlias: string): Promise<string> {
    const token = uuidv4();
    const now = Date.now();
    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          token,
          userAlias,
          timestamp: now,
        },
      })
    );
    return token;
  }

  async validateAuthToken(token: string): Promise<boolean> {
    const cmd = new GetCommand({
      TableName: this.tableName,
      Key: { token },
    });
    const result = await this.client.send(cmd);
    if (!result.Item) return false;

    const { timestamp } = result.Item;
    const now = Date.now();

    // Optional expiration check (if you want expiration logic)
    if (now - timestamp > DynamoDBAuthDataDAO.EXPIRE_AFTER) {
      // Optionally: delete the expired token
      await this.deleteAuthToken(token);
      return false;
    }

    return true;
  }

  async deleteAuthToken(token: string): Promise<void> {
    await this.client.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { token },
      })
    );
  }
}
