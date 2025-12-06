import { UserDAO } from "../interface/UserDAO";
import { UserDto } from "tweeter-shared";
import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { compare, hash } from "bcryptjs";
import { BaseDynamoDBDAO } from "../base/BaseDynamoDBDAO";
import { batchGetUsers } from "../utils/UserHydrationHelpers";

export class DynamoDBUserDAO extends BaseDynamoDBDAO implements UserDAO {
  private tableName = "user";
  private aliasIndexName = "alias_index";

  async getUserById(userId: string): Promise<UserDto | undefined> {
    const cmd = new GetCommand({
      TableName: this.tableName,
      Key: { userId },
    });
    const result = await this.client.send(cmd);
    if (!result.Item) return undefined;

    // Map DB item to UserDto (exclude password)
    const { userId: id, firstName, lastName, alias, imageUrl, followerCount, followeeCount } = result.Item;
    return { userId: id, firstName, lastName, alias, imageUrl, followerCount, followeeCount };
  }

  async getUserByAlias(alias: string): Promise<UserDto | undefined> {
    const cmd = new QueryCommand({
      TableName: this.tableName,
      IndexName: this.aliasIndexName,
      KeyConditionExpression: "alias = :alias",
      ExpressionAttributeValues: {
        ":alias": alias,
      },
      Limit: 1,
    });
    const result = await this.client.send(cmd);
    if (!result.Items || result.Items.length === 0) return undefined;

    // Map DB item to UserDto (exclude password)
    const { userId, firstName, lastName, alias: userAlias, imageUrl, followerCount, followeeCount } = result.Items[0];
    return { userId, firstName, lastName, alias: userAlias, imageUrl, followerCount, followeeCount };
  }

  async createUser(user: UserDto, password: string): Promise<void> {
    const hashedPassword = await hash(password, 10);
    const cmd = new PutCommand({
      TableName: this.tableName,
      Item: {
        ...user,
        password: hashedPassword,
        followerCount: 0,
        followeeCount: 0,
      },
    });
    await this.client.send(cmd);
  }

  async checkPassword(
    userId: string,
    suppliedPassword: string
  ): Promise<boolean> {
    const cmd = new GetCommand({
      TableName: this.tableName,
      Key: { userId },
      ProjectionExpression: "password",
    });
    const result = await this.client.send(cmd);
    const hash = result.Item?.password;
    return hash ? await compare(suppliedPassword, hash) : false;
  }

  async incrementFollowerCount(userId: string, delta: number): Promise<void> {
    const cmd = new UpdateCommand({
      TableName: this.tableName,
      Key: { userId },
      UpdateExpression: "ADD followerCount :delta",
      ExpressionAttributeValues: {
        ":delta": delta,
      },
    });
    await this.client.send(cmd);
  }

  async incrementFolloweeCount(userId: string, delta: number): Promise<void> {
    const cmd = new UpdateCommand({
      TableName: this.tableName,
      Key: { userId },
      UpdateExpression: "ADD followeeCount :delta",
      ExpressionAttributeValues: {
        ":delta": delta,
      },
    });
    await this.client.send(cmd);
  }

  async batchGetUsersByIds(userIds: string[]): Promise<Map<string, UserDto>> {
    return await batchGetUsers(this.client, this.tableName, userIds);
  }
}
