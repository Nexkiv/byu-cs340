import { SessionTokenDto } from "../dto/SessionTokenDto";

export class SessionToken {
  private _tokenId: string;
  private _userId: string;
  private _expirationTime: number;

  public constructor(
    tokenId: string,
    userId: string,
    expirationTime: number
  ) {
    this._tokenId = tokenId;
    this._userId = userId;
    this._expirationTime = expirationTime;
  }

  public get tokenId(): string {
    return this._tokenId;
  }

  public set tokenId(value: string) {
    this._tokenId = value;
  }

  public get userId(): string {
    return this._userId;
  }

  public set userId(value: string) {
    this._userId = value;
  }

  public get expirationTime(): number {
    return this._expirationTime;
  }

  public set expirationTime(value: number) {
    this._expirationTime = value;
  }

  public isExpired(): boolean {
    return Date.now() > this._expirationTime;
  }

  public static fromJson(json: string | null | undefined): SessionToken | null {
    if (!!json) {
      const jsonObject: {
        _tokenId: string;
        _userId: string;
        _expirationTime: number;
      } = JSON.parse(json);
      return new SessionToken(
        jsonObject._tokenId,
        jsonObject._userId,
        jsonObject._expirationTime
      );
    } else {
      return null;
    }
  }

  public toJson(): string {
    return JSON.stringify(this);
  }

  public get dto(): SessionTokenDto {
    return {
      tokenId: this._tokenId,
      userId: this._userId,
      expirationTime: this._expirationTime,
    };
  }

  public static fromDto(
    dto: SessionTokenDto | null
  ): SessionToken | null {
    return dto === null
      ? null
      : new SessionToken(dto.tokenId, dto.userId, dto.expirationTime);
  }
}
