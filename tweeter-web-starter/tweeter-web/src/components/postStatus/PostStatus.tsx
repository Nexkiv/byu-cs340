import "./PostStatus.css";
import { useRef, useState } from "react";
import { AuthToken, Status } from "tweeter-shared";
import { useMessageActions } from "../hooks/MessageHooks";
import { useUserInfo } from "../userInfo/UserInfoHooks";
import { PostStatusPresenter } from "../../presenter/PostStatusPresenter";

const PostStatus = () => {
  const { displayInfoMessage, displayErrorMessage, deleteMessage } =
    useMessageActions();

  const { currentUser, authToken } = useUserInfo();
  const [post, setPost] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const presenterRef = useRef<PostStatusPresenter | null>(null);
  if (!presenterRef.current) {
    presenterRef.current = new PostStatusPresenter();
  }

  const submitPost = async (event: React.MouseEvent) => {
    event.preventDefault();

    // TODO: move this into the PostStatus Prsenter
    var postingStatusToastId = "";

    try {
      setIsLoading(true);
      postingStatusToastId = displayInfoMessage("Posting status...", 0);

      const status = new Status(post, currentUser!, Date.now());

      await presenterRef.current!.postStatus(authToken!, status);

      setPost("");
      displayInfoMessage("Status posted!", 2000);
    } catch (error) {
      displayErrorMessage(
        `Failed to post the status because of exception: ${error}`
      );
    } finally {
      deleteMessage(postingStatusToastId);
      setIsLoading(false);
    }
  };

  const clearPost = (event: React.MouseEvent) => {
    event.preventDefault();
    setPost("");
  };

  return (
    <form>
      <div className="form-group mb-3">
        <textarea
          className="form-control"
          id="postStatusTextArea"
          rows={10}
          placeholder="What's on your mind?"
          value={post}
          onChange={(event) => {
            setPost(event.target.value);
          }}
        />
      </div>
      <div className="form-group">
        <button
          id="postStatusButton"
          className="btn btn-md btn-primary me-1"
          type="button"
          disabled={presenterRef.current!.checkButtonStatus(
            post,
            authToken,
            currentUser
          )}
          style={{ width: "8em" }}
          onClick={submitPost}
        >
          {isLoading ? (
            <span
              className="spinner-border spinner-border-sm"
              role="status"
              aria-hidden="true"
            ></span>
          ) : (
            <div>Post Status</div>
          )}
        </button>
        <button
          id="clearStatusButton"
          className="btn btn-md btn-secondary"
          type="button"
          disabled={presenterRef.current!.checkButtonStatus(
            post,
            authToken,
            currentUser
          )}
          onClick={clearPost}
        >
          Clear
        </button>
      </div>
    </form>
  );
};

export default PostStatus;
