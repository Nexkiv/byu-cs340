import { StatusDto } from "../dto/StatusDto";
import { Item, ItemStatic } from "./Item";
import { PostSegment, Type } from "./PostSegment";
import { User } from "./User";
import { format } from "date-fns";

export class Status implements Item<StatusDto> {
  private _statusId: string;
  private _userId: string;
  private _user?: User; // Optional for frontend display
  private _contents: string;
  private _postTime: number;
  private _segments: PostSegment[];

  public constructor(statusId: string, userId: string, contents: string, postTime: number, user?: User) {
    this._statusId = statusId;
    this._userId = userId;
    this._user = user;
    this._contents = contents;
    this._postTime = postTime;
    this._segments = this.getPostSegments(contents);
  }

  private getPostSegments(post: string): PostSegment[] {
    const segments: PostSegment[] = [];

    let startIndex = 0;

    for (let reference of Status.getSortedReferences(post)) {
      if (startIndex < reference.startPostion) {
        segments.push(
          new PostSegment(
            post.substring(startIndex, reference.startPostion),
            startIndex,
            reference.startPostion - 1,
            Type.text
          )
        );
      }

      segments.push(reference);

      startIndex = reference.endPosition;
    }

    if (startIndex < post.length) {
      segments.push(
        new PostSegment(
          post.substring(startIndex),
          startIndex,
          post.length,
          Type.text
        )
      );
    }

    return segments;
  }

  private static getSortedReferences(post: string): PostSegment[] {
    const references = [
      ...Status.parseUrlReferences(post),
      ...Status.parseMentionReferences(post),
      ...Status.parseNewlines(post),
    ];

    references.sort((a, b) => {
      return a.startPostion - b.startPostion;
    });

    return references;
  }

  private static parseUrlReferences(post: string): PostSegment[] {
    const references: PostSegment[] = [];

    const urls: string[] = Status.parseUrls(post);

    let previousStartIndex = 0;

    for (let url of urls) {
      let startIndex = post.indexOf(url, previousStartIndex);

      if (startIndex > -1) {
        // Push the url
        references.push(
          new PostSegment(url, startIndex, startIndex + url.length, Type.url)
        );

        // Move start and previous start past the url
        startIndex = startIndex + url.length;
        previousStartIndex = startIndex;
      }
    }

    return references;
  }

  private static parseUrls(post: string): string[] {
    const urls: string[] = [];

    for (let word of post.split(/(\s+)/)) {
      if (word.startsWith("http://") || word.startsWith("https://")) {
        const endIndex = Status.findUrlEndIndex(word);
        urls.push(word.substring(0, endIndex));
      }
    }

    return urls;
  }

  private static findUrlEndIndex(word: string): number {
    let index;

    if (word.includes(".com")) {
      index = word.indexOf(".com");
      index += 4;
    } else if (word.includes(".net")) {
      index = word.indexOf(".net");
      index += 4;
    } else if (word.includes(".org")) {
      index = word.indexOf(".org");
      index += 4;
    } else if (word.includes(".edu")) {
      index = word.indexOf(".edu");
      index += 4;
    } else if (word.includes(".mil")) {
      index = word.indexOf(".mil");
      index += 4;
    } else {
      index = word.length;

      // Remove trailing non-alphabetic characters (such as punctuation) that can't be at the end of a url
      while (!Status.isLetter(word[index])) {
        index--;
      }
    }

    return index;
  }

  private static isLetter(c: string): boolean {
    return c.length === 1 && c.match(/[a-zA-Z]/g) != null;
  }

  private static parseMentionReferences(post: string): PostSegment[] {
    const references: PostSegment[] = [];

    const mentions: string[] = Status.parseMentions(post);

    let previousStartIndex = 0;

    for (let mention of mentions) {
      let startIndex = post.indexOf(mention, previousStartIndex);

      if (startIndex > -1) {
        // Push the alias
        references.push(
          new PostSegment(
            mention,
            startIndex,
            startIndex + mention.length,
            Type.alias
          )
        );

        // Move start and previous start past the mention
        startIndex = startIndex + mention.length;
        previousStartIndex = startIndex;
      }
    }

    return references;
  }

  private static parseMentions(post: string): string[] {
    const mentions: string[] = [];

    for (let word of post.split(/(\s+)/)) {
      if (word.startsWith("@")) {
        // Remove all non-alphanumeric characters
        word.replaceAll(/[^a-zA-Z0-9]/g, "");

        mentions.push(word);
      }
    }

    return mentions;
  }

  private static parseNewlines(post: string): PostSegment[] {
    const newlines: PostSegment[] = [];

    const regex = /\n/g;

    let match;
    while ((match = regex.exec(post)) !== null) {
      const matchIndex = match.index;
      newlines.push(
        new PostSegment("\n", matchIndex, matchIndex + 1, Type.newline)
      );
    }

    return newlines;
  }

  public get statusId(): string {
    return this._statusId;
  }

  public set statusId(value: string) {
    this._statusId = value;
  }

  public get userId(): string {
    return this._userId;
  }

  public set userId(value: string) {
    this._userId = value;
  }

  public get user(): User | undefined {
    return this._user;
  }

  public set user(value: User | undefined) {
    this._user = value;
  }

  public get contents(): string {
    return this._contents;
  }

  public set contents(value: string) {
    this._contents = value;
    this._segments = this.getPostSegments(value);
  }

  public get postTime(): number {
    return this._postTime;
  }

  public get formattedDate(): string {
    let date: Date = new Date(this.postTime);
    return format(date, "MMMM dd, yyyy HH:mm:ss");
  }

  public set postTime(value: number) {
    this._postTime = value;
  }

  public get segments(): PostSegment[] {
    return this._segments;
  }

  public set segments(value: PostSegment[]) {
    this._segments = value;
  }

  public equals(other: Status): boolean {
    return (
      this._statusId === other._statusId &&
      this._userId === other._userId &&
      this._postTime === other._postTime &&
      this._contents === other._contents
    );
  }

  public static fromJson(json: string | null | undefined): Status | null {
    if (!!json) {
      const jsonObject: {
        _statusId: string;
        _userId: string;
        _contents: string;
        _postTime: number;
        _segments: PostSegment[];
      } = JSON.parse(json);
      return new Status(
        jsonObject._statusId,
        jsonObject._userId,
        jsonObject._contents,
        jsonObject._postTime
      );
    } else {
      return null;
    }
  }

  public toJson(): string {
    return JSON.stringify(this);
  }

  public get dto(): StatusDto {
    return {
      statusId: this.statusId,
      userId: this.userId,
      user: this._user?.dto,
      contents: this.contents,
      postTime: this.postTime,
    };
  }

  public static fromDto(dto: StatusDto | null): Status | null {
    return dto === null
      ? null
      : new Status(
          dto.statusId,
          dto.userId,
          dto.contents,
          dto.postTime,
          dto.user ? (User.fromDto(dto.user) ?? undefined) : undefined
        );
  }
}

// Enforce the static interface via the constructor signature
const StatusConstructor: ItemStatic<StatusDto, Status> = Status;
