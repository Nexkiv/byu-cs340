export interface AuthDataDAO {
  createAuthToken(userAlias: string): Promise<string>;
  validateAuthToken(token: string): Promise<boolean>;
  deleteAuthToken(token: string): Promise<void>;
}
