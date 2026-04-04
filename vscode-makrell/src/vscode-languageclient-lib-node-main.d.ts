declare module "vscode-languageclient/lib/node/main" {
    export type ServerOptions = any;
    export type LanguageClientOptions = any;

    export enum State {
        Stopped = 1,
        Starting = 2,
        Running = 3,
        Stopping = 4,
    }

    export class LanguageClient {
        constructor(name: string, serverOptions: ServerOptions, clientOptions: LanguageClientOptions, forceDebug?: boolean);
        constructor(id: string, name: string, serverOptions: ServerOptions, clientOptions: LanguageClientOptions, forceDebug?: boolean);
        start(): Promise<void>;
        stop(): Promise<void>;
        dispose(): void;
        readonly state: State;
        initializeResult?: any;
    }
}
