import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

/**
 * Base class for all DynamoDB DAOs.
 * Provides shared DynamoDB client singleton for efficient connection pooling.
 *
 * Design Pattern: Template Method Pattern with singleton client
 * - All DynamoDB DAOs extend this base class
 * - Singleton client is shared across all DAO instances
 * - Subclasses define table names and implement DAO-specific methods
 *
 * Benefits:
 * - Eliminates client initialization duplication (6x instances → 1 singleton)
 * - Connection pooling efficiency (AWS SDK manages pool internally)
 * - Memory efficiency (one client for all DAOs)
 * - AWS best practice (SDK documentation recommends reusing clients)
 */
export abstract class BaseDynamoDBDAO {
  /**
   * Singleton DynamoDB client instance shared across all DAOs.
   * Lazily initialized on first access.
   */
  private static clientInstance: DynamoDBDocumentClient | null = null;

  /**
   * Protected client available to all subclasses.
   * Initialized in constructor via singleton getter.
   */
  protected readonly client: DynamoDBDocumentClient;

  /**
   * Constructor initializes client via singleton pattern.
   * Subclasses should call super() before defining table names.
   */
  constructor() {
    this.client = BaseDynamoDBDAO.getClient();
  }

  /**
   * Gets or creates the singleton DynamoDB client.
   * Lazy initialization ensures client is created only once across all DAO instances.
   * Thread-safe: AWS SDK clients are designed to be shared.
   *
   * @returns Shared DynamoDB DocumentClient instance
   */
  private static getClient(): DynamoDBDocumentClient {
    if (!BaseDynamoDBDAO.clientInstance) {
      BaseDynamoDBDAO.clientInstance = DynamoDBDocumentClient.from(
        new DynamoDBClient({})
      );
    }
    return BaseDynamoDBDAO.clientInstance;
  }

  /**
   * Resets the client singleton (for testing purposes only).
   * Allows test suites to isolate client behavior or inject mocks.
   *
   * WARNING: Do NOT use in production code. This breaks the singleton pattern
   * and should only be called by test setup/teardown hooks.
   */
  static resetClient(): void {
    BaseDynamoDBDAO.clientInstance = null;
  }
}
