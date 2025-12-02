import { SessionDAO } from "../interface/SessionDAO";
import { SessionTokenDto } from "tweeter-shared";
import { PutCommand, GetCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { BaseDynamoDBDAO } from "../base/BaseDynamoDBDAO";

export class DynamoDBSessionDAO extends BaseDynamoDBDAO implements SessionDAO {
  private tableName = "sessionTokens";
  private static EXPIRE_AFTER = 24 * 60 * 60 * 1000; // 24 hours

  async createSessionToken(userId: string): Promise<SessionTokenDto> {
    const tokenId = uuidv4();
    const expirationTime = Date.now() + DynamoDBSessionDAO.EXPIRE_AFTER;

    const sessionToken: SessionTokenDto = {
      tokenId,
      userId,
      expirationTime,
    };

    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: sessionToken,
      })
    );

    return sessionToken;
  }

  async validateSessionToken(tokenId: string): Promise<SessionTokenDto | null> {
    const result = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { tokenId },
      })
    );

    if (!result.Item) {
      return null; // Token doesn't exist
    }

    const token = result.Item as SessionTokenDto;

    // Check if expired (even though TTL will eventually delete it)
    if (Date.now() > token.expirationTime) {
      return null; // Token expired
    }

    return token;
  }

  async deleteSessionToken(tokenId: string): Promise<void> {
    await this.client.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { tokenId },
      })
    );
  }
}
