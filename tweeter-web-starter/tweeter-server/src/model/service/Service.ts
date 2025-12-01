import { SessionDAO } from "../../dao/interface/SessionDAO";
import { SessionDAOFactory } from "../../dao/factory/SessionDAOFactory";

export abstract class Service {
  protected sessionDAO: SessionDAO;

  constructor() {
    this.sessionDAO = SessionDAOFactory.create("dynamo");
  }

  /**
   * Template method for operations requiring authentication.
   * Validates the session token and extracts the userId before executing the operation.
   *
   * @param token - Session token from the request
   * @param operation - Business logic to execute with the authenticated userId
   * @returns Result of the operation
   * @throws Error with "unauthorized" prefix if token is invalid (maps to HTTP 401)
   */
  protected async doAuthenticatedOperation<T>(
    token: string,
    operation: (userId: string) => Promise<T>
  ): Promise<T> {
    const session = await this.sessionDAO.validateSessionToken(token);
    if (!session) {
      throw new Error("unauthorized: Invalid or expired session token");
    }
    return await operation(session.userId);
  }
}
