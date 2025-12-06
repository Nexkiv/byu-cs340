import { User } from "tweeter-shared";
import { PagedItemPresenter, PagedItemView } from "./PagedItemPresenter";
import { FollowService } from "../../model.service/FollowService";

export abstract class UserItemPresenter extends PagedItemPresenter<
  User,
  FollowService
> {
  // Pagination tokens for DynamoDB GSI pagination
  private _lastFollowTime: number | null = null;
  private _lastFollowId: string | null = null;

  protected get lastFollowTime(): number | null {
    return this._lastFollowTime;
  }

  protected set lastFollowTime(value: number | null) {
    this._lastFollowTime = value;
  }

  protected get lastFollowId(): string | null {
    return this._lastFollowId;
  }

  protected set lastFollowId(value: string | null) {
    this._lastFollowId = value;
  }

  protected serviceFactory(): FollowService {
    return new FollowService();
  }

  public reset(): void {
    super.reset();
    this._lastFollowTime = null;
    this._lastFollowId = null;
  }
}
