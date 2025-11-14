import { useState, useEffect, useRef } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { useParams } from "react-router-dom";
import { useMessageActions } from "../hooks/MessageHooks";
import { useUserInfo, useUserInfoActions } from "../userInfo/UserInfoHooks";
import {
  PagedItemPresenter,
  PagedItemView,
} from "../../presenter/mainLayout/PagedItemPresenter";
import { Service } from "../../model.service/Service";
import { Dto, Item } from "tweeter-shared";

interface Props<I extends Item<Dto>, S extends Service> {
  presenterFactory: (view: PagedItemView<I>) => PagedItemPresenter<I, S>;
  itemComponentFactory: (item: I) => JSX.Element;
}

const ItemScroller = <I extends Item<Dto>, S extends Service>(
  props: Props<I, S>
) => {
  const { displayErrorMessage } = useMessageActions();
  const [items, setItems] = useState<I[]>([]);

  const { displayedUser, authToken } = useUserInfo();
  const { setDisplayedUser } = useUserInfoActions();
  const { displayedUser: displayedUserAliasParam } = useParams();

  const view: PagedItemView<I> = {
    addItems: (newItems: I[]) =>
      setItems((previousItems) => [...previousItems, ...newItems]),
    displayErrorMessage: displayErrorMessage,
  };

  const presenterRef = useRef<PagedItemPresenter<I, S> | null>(null);
  if (!presenterRef.current) {
    presenterRef.current = props.presenterFactory(view);
  }

  // Update the displayed user context variable whenever the displayedUser url parameter changes.
  // This allows browser forward and back buttons to work correctly.
  useEffect(() => {
    if (
      authToken &&
      displayedUserAliasParam &&
      displayedUserAliasParam != displayedUser!.alias
    ) {
      presenterRef
        .current!.getUser(authToken!, displayedUserAliasParam!)
        .then((toUser) => {
          if (toUser) {
            setDisplayedUser(toUser);
          }
        });
    }
  }, [displayedUserAliasParam]);

  // Initialize the component whenever the displayed user changes
  useEffect(() => {
    reset();
    loadMoreItems();
  }, [displayedUser]);

  const reset = async () => {
    setItems(() => []);
    presenterRef.current!.reset();
  };

  const loadMoreItems = async () => {
    await presenterRef.current!.loadMoreItems(authToken!, displayedUser!.alias);
  };

  return (
    <div className="container px-0 overflow-visible vh-100">
      <InfiniteScroll
        className="pr-0 mr-0"
        dataLength={items.length}
        next={() => loadMoreItems()}
        hasMore={presenterRef.current!.hasMoreItems}
        loader={<h4>Loading...</h4>}
      >
        {items.map((item, index) => (
          <div
            key={index}
            className="row mb-3 mx-0 px-0 border rounded bg-white"
          >
            {props.itemComponentFactory(item)}
          </div>
        ))}
      </InfiniteScroll>
    </div>
  );
};

export default ItemScroller;
