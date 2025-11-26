import { UserDAO } from "../interface/UserDAO";
import { UserDto } from "tweeter-shared";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { compare, hash } from "bcryptjs";

export class DynamoDBUserDAO implements UserDAO {
  private tableName = "user";
  private client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

  async getUser(alias: string): Promise<UserDto | undefined> {
    const cmd = new GetCommand({
      TableName: this.tableName,
      Key: { alias },
    });
    const result = await this.client.send(cmd);
    const item = result.Item;
    if (!item) return undefined;
    // Map DB item into UserDto (ignore password hash)
    const { firstName, lastName, alias: userAlias, imageUrl } = item;
    return { firstName, lastName, alias: userAlias, imageUrl };
  }

  async createUser(user: UserDto, password: string): Promise<void> {
    const hashedPassword = await hash(password, 10);
    const cmd = new PutCommand({
      TableName: this.tableName,
      Item: {
        ...user,
        password: hashedPassword,
      },
    });
    await this.client.send(cmd);
  }

  async checkPassword(
    alias: string,
    suppliedPassword: string
  ): Promise<boolean> {
    const cmd = new GetCommand({
      TableName: this.tableName,
      Key: { alias },
      ProjectionExpression: "password",
    });
    const result = await this.client.send(cmd);
    const hash = result.Item?.password;
    return hash ? await compare(suppliedPassword, hash) : false;
  }
}
