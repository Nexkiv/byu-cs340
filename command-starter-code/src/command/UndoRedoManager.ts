import { Command } from "./Command";

export class UndoRedoManager {
  private undoStack: Command[];
  private redoStack: Command[];

  constructor() {
    this.undoStack = [];
    this.redoStack = [];
  }

  public execute(action: Command) {
    action.execute();

    this.undoStack.push(action);
    this.redoStack = [];
  }

  public undo() {
    const action = this.undoStack.pop();
    if (!!action) {
      action.undo();
      this.redoStack.push(action);
    }
  }

  public redo() {
    const action = this.redoStack.pop();
    if (!!action) {
      action.execute();
      this.undoStack.push(action);
    }
  }

  public get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public get canRedo(): boolean {
    return this.redoStack.length > 0;
  }
}
