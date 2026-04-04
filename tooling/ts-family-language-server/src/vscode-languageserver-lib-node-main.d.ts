declare module "vscode-languageserver/lib/node/main" {
  export type Connection = any;
  export type Diagnostic = any;
  export type DocumentSymbol = any;
  export type Hover = any;
  export type InitializeParams = any;
  export type InitializeResult = any;
  export type ReferenceParams = any;
  export type RenameParams = any;
  export type Range = any;
  export type CompletionItem = any;
  export type TextEdit = any;

  export enum DiagnosticSeverity {
    Error = 1,
    Warning = 2,
    Information = 3,
    Hint = 4,
  }

  export enum TextDocumentSyncKind {
    None = 0,
    Full = 1,
    Incremental = 2,
  }

  export enum CompletionItemKind {
    Text = 1,
    Snippet = 15,
  }

  export enum SymbolKind {
    File = 1,
    Module = 2,
    Namespace = 3,
    Package = 4,
    Class = 5,
    Method = 6,
    Property = 7,
    Field = 8,
    Constructor = 9,
    Enum = 10,
    Interface = 11,
    Function = 12,
    Variable = 13,
    Constant = 14,
    String = 15,
    Number = 16,
    Boolean = 17,
    Array = 18,
    Object = 19,
    Key = 20,
    Null = 21,
    EnumMember = 22,
    Struct = 23,
    Event = 24,
    Operator = 25,
    TypeParameter = 26,
  }

  export enum InsertTextFormat {
    PlainText = 1,
    Snippet = 2,
  }

  export const ProposedFeatures: {
    all: any;
  };

  export function createConnection(...args: any[]): any;
}
