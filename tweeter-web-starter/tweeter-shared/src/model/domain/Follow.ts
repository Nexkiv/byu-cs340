import { FollowDto } from "../dto/FollowDto";

export class Follow {
    private _followId: string;
    private _followerUserId: string;
    private _followeeUserId: string;
    private _followTime: number;
    private _unfollowTime: number | null;

    public constructor(
        followId: string,
        followerUserId: string,
        followeeUserId: string,
        followTime: number,
        unfollowTime: number | null = null
    ) {
        this._followId = followId;
        this._followerUserId = followerUserId;
        this._followeeUserId = followeeUserId;
        this._followTime = followTime;
        this._unfollowTime = unfollowTime;
    }

    public get followId(): string {
        return this._followId;
    }

    public get followerUserId(): string {
        return this._followerUserId;
    }

    public get followeeUserId(): string {
        return this._followeeUserId;
    }

    public get followTime(): number {
        return this._followTime;
    }

    public get unfollowTime(): number | null {
        return this._unfollowTime;
    }

    public set unfollowTime(value: number | null) {
        this._unfollowTime = value;
    }

    public get isActive(): boolean {
        return this._unfollowTime === null;
    }

    public get dto(): FollowDto {
        return {
            followId: this._followId,
            followerUserId: this._followerUserId,
            followeeUserId: this._followeeUserId,
            followTime: this._followTime,
            unfollowTime: this._unfollowTime
        };
    }

    public static fromDto(dto: FollowDto | null): Follow | null {
        return dto === null
            ? null
            : new Follow(
                dto.followId,
                dto.followerUserId,
                dto.followeeUserId,
                dto.followTime,
                dto.unfollowTime
            );
    }
}
