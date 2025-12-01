export interface SessionTokenDto {
  readonly tokenId: string; // UUID - Primary key
  readonly userId: string; // UUID - User who owns this session
  readonly expirationTime: number; // Unix timestamp - when token expires
}
