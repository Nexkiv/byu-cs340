import { Dto } from "../dto/Dto";
import { UserDto } from "../dto/UserDto";
import { Item, ItemStatic } from "./Item";

export class User implements Item<UserDto> {
  private _userId: string;
  private _firstName: string;
  private _lastName: string;
  private _alias: string;
  private _imageUrl: string;
  private _followerCount: number;
  private _followeeCount: number;

  public constructor(
    userId: string,
    firstName: string,
    lastName: string,
    alias: string,
    imageUrl: string,
    followerCount: number,
    followeeCount: number
  ) {
    this._userId = userId;
    this._firstName = firstName;
    this._lastName = lastName;
    this._alias = alias;
    this._imageUrl = imageUrl;
    this._followerCount = followerCount;
    this._followeeCount = followeeCount;
  }

  public get userId(): string {
    return this._userId;
  }

  public set userId(value: string) {
    this._userId = value;
  }

  public get firstName(): string {
    return this._firstName;
  }

  public set firstName(value: string) {
    this._firstName = value;
  }

  public get lastName(): string {
    return this._lastName;
  }

  public set lastName(value: string) {
    this._lastName = value;
  }

  public get name() {
    return `${this.firstName} ${this.lastName}`;
  }

  public get alias(): string {
    return this._alias;
  }

  public set alias(value: string) {
    this._alias = value;
  }

  public get imageUrl(): string {
    return this._imageUrl;
  }

  public set imageUrl(value: string) {
    this._imageUrl = value;
  }

  public get followerCount(): number {
    return this._followerCount;
  }

  public set followerCount(value: number) {
    this._followerCount = value;
  }

  public get followeeCount(): number {
    return this._followeeCount;
  }

  public set followeeCount(value: number) {
    this._followeeCount = value;
  }

  public equals(other: User): boolean {
    return this._alias === other._alias;
  }

  public static fromJson(json: string | null | undefined): User | null {
    if (!!json) {
      const jsonObject: {
        _userId: string;
        _firstName: string;
        _lastName: string;
        _alias: string;
        _imageUrl: string;
        _followerCount: number;
        _followeeCount: number;
      } = JSON.parse(json);
      return new User(
        jsonObject._userId,
        jsonObject._firstName,
        jsonObject._lastName,
        jsonObject._alias,
        jsonObject._imageUrl,
        jsonObject._followerCount,
        jsonObject._followeeCount
      );
    } else {
      return null;
    }
  }

  public toJson(): string {
    return JSON.stringify(this);
  }

  public get dto(): UserDto {
    return {
      userId: this.userId,
      firstName: this.firstName,
      lastName: this.lastName,
      alias: this.alias,
      imageUrl: this.imageUrl,
      followerCount: this.followerCount,
      followeeCount: this.followeeCount,
    };
  }

  public static fromDto(dto: UserDto | null): User | null {
    return dto === null
      ? null
      : new User(
          dto.userId,
          dto.firstName,
          dto.lastName,
          dto.alias,
          dto.imageUrl,
          dto.followerCount,
          dto.followeeCount
        );
  }
}
