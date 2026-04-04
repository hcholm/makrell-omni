declare module "vscode-languageserver-textdocument/lib/umd/main" {
  export class TextDocument {
    static create(uri: string, languageId: string, version: number, content: string): TextDocument;
    static update(document: TextDocument, changes: Array<{ text: string }>, version: number): TextDocument;
    readonly uri: string;
    getText(): string;
  }
}
