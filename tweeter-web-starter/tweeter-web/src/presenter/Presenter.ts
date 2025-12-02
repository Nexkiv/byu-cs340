export interface View {
  displayErrorMessage: (message: string) => void;
}

export interface MessageView extends View {
  displayInfoMessage: (
    message: string,
    duration: number,
    bootstrapClasses?: string | undefined
  ) => string;
  deleteMessage: (messageId: string) => void;
}

export abstract class Presenter<V extends View> {
  private _view: V;

  public constructor(view: V) {
    this._view = view;
  }

  protected get view() {
    return this._view;
  }

  protected async doFailureReportingOperation(
    operation: () => Promise<void>,
    operationDescription: string
  ) {
    try {
      await operation();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.view.displayErrorMessage(this.cleanErrorMessage(message));
    }
  }

  /**
   * Removes technical prefixes from error messages before displaying to users.
   * Examples:
   *   "unauthorized: Invalid token" -> "Invalid token"
   *   "bad-request: Invalid password" -> "Invalid password"
   *   "bad-request: Missing field" -> "Missing field"
   */
  private cleanErrorMessage(message: string): string {
    // Remove lowercase prefix pattern: "unauthorized:", "bad-request:", etc.
    message = message.replace(/^[a-z-]+:\s*/, '');

    // Remove bracketed prefix pattern: "[Bad Request]", "[Unauthorized]", etc.
    message = message.replace(/^\[.*?\]\s*/, '');

    // Remove any ClientCommunicator wrapping that might have slipped through
    message = message.replace(/^Client communicator \w+ failed:\s*/i, '');

    // Remove generic exception wrapping
    message = message.replace(/^Failed to .* because of exception:\s*/i, '');

    return message.trim();
  }
}
