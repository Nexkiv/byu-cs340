import { AuthToken, Dto, User } from "tweeter-shared";
import { UserService } from "../../model.service/UserService";
import { Presenter, View } from "../Presenter";
import { Service } from "../../model.service/Service";
import { Item } from "tweeter-shared";

export const PAGE_SIZE = 10;

export interface PagedItemView<I extends Item<Dto>> extends View {
  addItems: (items: I[]) => void;
}

export abstract class PagedItemPresenter<
  I extends Item<Dto>,
  S extends Service
> extends Presenter<PagedItemView<I>> {
  private userService: UserService = new UserService();
  private _hasMoreItems = true;
  private _lastItem: I | null = null;
  private _service: S;

  public constructor(view: PagedItemView<I>) {
    super(view);
    this._service = this.serviceFactory();
  }

  protected abstract serviceFactory(): S;

  protected get lastItem() {
    return this._lastItem;
  }

  protected set lastItem(value: I | null) {
    this._lastItem = value;
  }

  protected get service() {
    return this._service;
  }

  public get hasMoreItems() {
    return this._hasMoreItems;
  }

  protected set hasMoreItems(value: boolean) {
    this._hasMoreItems = value;
  }

  public reset() {
    this.lastItem = null;
    this.hasMoreItems = true;
  }

  public async getUser(
    authToken: AuthToken,
    alias: string
  ): Promise<User | null> {
    return await this.userService.getUser(authToken, alias);
  }

  public async loadMoreItems(authToken: AuthToken, userAlias: string) {
    await this.doFailureReportingOperation(async () => {
      const [newItems, hasMore] = await this.getMoreItems(authToken, userAlias);

      this.hasMoreItems = hasMore;
      this.lastItem =
        newItems.length > 0 ? newItems[newItems.length - 1] : null;
      this.view.addItems(newItems);
    }, this.itemDescription());
  }

  protected abstract itemDescription(): string;

  protected abstract getMoreItems(
    authToken: AuthToken,
    userAlias: string
  ): Promise<[I[], boolean]>;
}
