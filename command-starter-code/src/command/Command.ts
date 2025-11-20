// Command interface

import { IDocument } from "../document/IDocument";

export interface Command {
  execute(): void;
  undo(): void;
}

export class InsertCommand implements Command {
  constructor(
    private document: IDocument,
    private insertionIndex: number,
    private sequenceInput: string
  ) {}

  execute(): void {
    this.document.insert(this.insertionIndex, this.sequenceInput);
  }

  undo(): void {
    this.document.delete(this.insertionIndex, this.sequenceInput.length);
  }
}

export class DeleteCommand implements Command {
  private deletedText: string;

  constructor(
    private document: IDocument,
    private deletionIndex: number,
    private deletionDistance: number
  ) {
    this.deletedText = "";
  }

  execute(): void {
    this.deletedText = this.document.delete(
      this.deletionIndex,
      this.deletionDistance
    );
    if (this.deletedText == null) {
      console.log("Deletion unsuccessful");
    }
  }

  undo(): void {
    this.document.insert(this.deletionIndex, this.deletedText);
  }
}

export class ReplaceCommand implements Command {
  private deletedText: string;

  constructor(
    private document: IDocument,
    private replaceIndex: number,
    private replaceDistance: number,
    private replacementString: string
  ) {
    this.deletedText = "";
  }

  execute(): void {
    this.deletedText = this.document.delete(
      this.replaceIndex,
      this.replaceDistance
    );
    this.document.insert(this.replaceIndex, this.replacementString);
  }

  undo(): void {
    this.document.delete(this.replaceIndex, this.replacementString.length);
    this.document.insert(this.replaceIndex, this.deletedText);
  }
}

export class OpenCommand implements Command {
  private originalDocument: string;

  constructor(private document: IDocument, private openFileName: string) {
    this.originalDocument = document.getContents();
  }

  execute(): void {
    this.document.open(this.openFileName);
  }

  undo(): void {
    this.document.clear();
    this.document.insert(0, this.originalDocument);
  }
}

export class ClearCommand implements Command {
  private originalDocument: string;

  constructor(private document: IDocument) {
    this.originalDocument = document.getContents();
  }

  execute(): void {
    this.document.clear();
  }

  undo(): void {
    this.document.insert(0, this.originalDocument);
  }
}
