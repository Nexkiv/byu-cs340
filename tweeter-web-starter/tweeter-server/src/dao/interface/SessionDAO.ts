import { SessionTokenDto } from "tweeter-shared";

export interface SessionDAO {
  createSessionToken(userId: string): Promise<SessionTokenDto>;
  validateSessionToken(tokenId: string): Promise<SessionTokenDto | null>;
  deleteSessionToken(tokenId: string): Promise<void>;
}
