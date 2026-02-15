"use strict";

import * as net from "net";
import * as path from "path";
import * as vscode from "vscode";
import * as semver from "semver";
import * as os from 'os';

import { spawn, ChildProcess } from 'child_process';
import { PythonExtension } from "@vscode/python-extension";
import { LanguageClient, LanguageClientOptions, ServerOptions, State } from "vscode-languageclient/node";
import { start } from "repl";

const MIN_PYTHON = semver.parse("3.7.9")

let client: LanguageClient;
let clientStarting = false
let python: PythonExtension;
let logger: vscode.LogOutputChannel
// let pythonRepl: ChildProcess | null = null;
let mrTerminal: vscode.Terminal | null = null;

function getTerminalCommand(): string {
    switch (os.platform()) {
        case 'win32':
            return 'powershell.exe'; // PowerShell on Windows
        case 'darwin':
            return '/bin/zsh'; // Default shell for newer macOS versions
        case 'linux':
            return '/bin/bash'; // Common default for Linux
        default:
            return '/bin/bash'; // Fallback option
    }
}

function createPlatformIndependentTerminal(): void {
    const shellPath = getTerminalCommand();
    if (!mrTerminal) {
        mrTerminal = vscode.window.createTerminal({ name: "Makrell REPL", shellPath });
    }
    mrTerminal.show(true);
}

function startRepl() {
    createPlatformIndependentTerminal();
    mrTerminal?.sendText("makrell");
    vscode.window.showInformationMessage("Makrell REPL started.");
}

function stopRepl() {
    if (mrTerminal) {
        mrTerminal.dispose();
        mrTerminal = null;
        vscode.window.showInformationMessage("Makrell REPL stopped.");
    } else {
        vscode.window.showInformationMessage("Makrell REPL is not running.");
    }
}

function sendCodeToRepl() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage("No open text editor");
        return;
    }

    if (!mrTerminal) {
        vscode.window.showWarningMessage("Makrell REPL is not running. Start the REPL first.");
        return;
    }

    let selection = editor.selection;
    let codeToExecute = editor.document.getText(selection.isEmpty ? undefined : selection);
    mrTerminal.sendText(codeToExecute);
}


/**
 * This is the main entry point.
 * Called when vscode first activates the extension
 */
export async function activate(context: vscode.ExtensionContext) {
    logger = vscode.window.createOutputChannel('Makrell Language Server', { log: true })
    logger.info("Extension activated.")

    
    let disposable = vscode.commands.registerCommand('makrell.server.hi', function () {
        vscode.window.showInformationMessage('Hi.');
      });
    context.subscriptions.push(disposable);

    await getPythonExtension();
    if (!python) {
        logger.error(`Python extension not loaded!`)
       return
    }
    logger.info(`Found python extension: ${python}`)

    // Restart language server command
    context.subscriptions.push(
        vscode.commands.registerCommand("makrell.server.restart", async () => {
            logger.info('restarting server...')
            await startLangServer()
        })
    )

    // Execute command... command
    context.subscriptions.push(
        vscode.commands.registerCommand("makrell.server.executeCommand", async () => {
            await executeServerCommand()
        })
    )

    // Restart the language server if the user switches Python envs...
    context.subscriptions.push(
        python.environments.onDidChangeActiveEnvironmentPath(async () => {
            logger.info('python env modified, restarting server...')
            await startLangServer()
        })
    )

    // ... or if they change a relevant config option
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(async (event) => {
            if (event.affectsConfiguration("makrell.server") || event.affectsConfiguration("makrell.client")) {
                logger.info('config modified, restarting server...')
                await startLangServer()
            }
        })
    )

    // Start the language server once the user opens the first text document...
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(
            async () => {
                if (!client) {
                    await startLangServer()
                }
            }
        )
    )

    // ...or notebook.
    context.subscriptions.push(
        vscode.workspace.onDidOpenNotebookDocument(
            async () => {
                if (!client) {
                    await startLangServer()
                }
            }
        )
    )

    // Restart the server if the user modifies it.
    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument(async (document: vscode.TextDocument) => {
            const expectedUri = vscode.Uri.file(path.join(getCwd(), getServerPath()))

            if (expectedUri.toString() === document.uri.toString()) {
                logger.info('server modified, restarting...')
                await startLangServer()
            }
        })
    )

    let startReplCommand = vscode.commands.registerCommand('makrell.server.startRepl', startRepl);
    let sendToReplCommand = vscode.commands.registerCommand('makrell.server.sendToRepl', sendCodeToRepl);
    let stopReplCommand = vscode.commands.registerCommand('makrell.server.stopRepl', stopRepl);

    context.subscriptions.push(startReplCommand, sendToReplCommand, stopReplCommand);

    context.subscriptions.push(vscode.window.onDidCloseTerminal((terminal) => {
        if (terminal === mrTerminal) {
            mrTerminal = null;
        }
    }));
}

export function deactivate(): Thenable<void> {
    if (mrTerminal) {
        mrTerminal.dispose();
        mrTerminal = null;
    }
    return stopLangServer()
}

/**
 * Start (or restart) the language server.
 *
 * @param command The executable to run
 * @param args Arguments to pass to the executable
 * @param cwd The working directory in which to run the executable
 * @returns
 */
async function startLangServer() {

    // Don't interfere if we are already in the process of launching the server.
    if (clientStarting) {
        return
    }

    clientStarting = true
    if (client) {
        await stopLangServer()
    }

    const cwd = getCwd()
    const serverPath = getServerPath()

    logger.info(`cwd: '${cwd}'`)
    logger.info(`server: '${serverPath}'`)

    const resource = vscode.Uri.joinPath(vscode.Uri.file(cwd), serverPath)
    const pythonPath = await getPythonPath(resource)
    if (!pythonPath) {
        clientStarting = false
        return
    }

    const serverOptions: ServerOptions = {
        command: "makrell-langserver",
        args: [],
        options: { cwd },
    };

    client = new LanguageClient('makrell', serverOptions, getClientOptions());
    try {
        await client.start()
        clientStarting = false
    } catch (err) {
        clientStarting = false
        logger.error(`Unable to start server: ${err}`)
    }
}

async function stopLangServer(): Promise<void> {
    if (!client) {
        return
    }

    if (client.state === State.Running) {
        await client.stop()
    }

    client.dispose()
    client = undefined
}

function getClientOptions(): LanguageClientOptions {
    const config = vscode.workspace.getConfiguration('makrell.client')
    const options = {
        documentSelector: config.get<any>('documentSelector'),
        outputChannel: logger,
        connectionOptions: {
            maxRestartCount: 0 // don't restart on server failure.
        },
    };
    logger.info(`client options: ${JSON.stringify(options, undefined, 2)}`)
    return options
}

function startLangServerTCP(addr: number): LanguageClient {
    const serverOptions: ServerOptions = () => {
        return new Promise((resolve /*, reject */) => {
            const clientSocket = new net.Socket();
            clientSocket.connect(addr, "127.0.0.1", () => {
                resolve({
                    reader: clientSocket,
                    writer: clientSocket,
                });
            });
        });
    };

    return new LanguageClient(
        `tcp lang server (port ${addr})`,
        serverOptions,
        getClientOptions()
    );
}

/**
 * Execute a command provided by the language server.
 */
async function executeServerCommand() {
    if (!client || client.state !== State.Running) {
        await vscode.window.showErrorMessage("There is no language server running.")
        return
    }

    const knownCommands = client.initializeResult.capabilities.executeCommandProvider?.commands
    if (!knownCommands || knownCommands.length === 0) {
        const info = client.initializeResult.serverInfo
        const name = info?.name || "Server"
        const version = info?.version || ""

        await vscode.window.showInformationMessage(`${name} ${version} does not implement any commands.`)
        return
    }

    const commandName = await vscode.window.showQuickPick(knownCommands, { canPickMany: false })
    if (!commandName) {
        return
    }
    logger.info(`executing command: '${commandName}'`)

    const result = await vscode.commands.executeCommand(commandName /* if your command accepts arguments you can pass them here */)
    logger.info(`${commandName} result: ${JSON.stringify(result, undefined, 2)}`)
}

/**
 * If the user has explicitly provided a src directory use that.
 * Otherwise, fallback to the examples/servers directory.
 *
 * @returns The working directory from which to launch the server
 */
function getCwd(): string {
    const config = vscode.workspace.getConfiguration("makrell.server")
    const cwd = config.get<string>('cwd')
    if (cwd) {
        return cwd
    }
    return __dirname;

    // const serverDir = path.resolve(
    //     path.join(__dirname, "..", "..", "servers")
    // )
    // return serverDir
}

/**
 *
 * @returns The python script to launch the server with
 */
function getServerPath(): string {
    const config = vscode.workspace.getConfiguration("makrell.server")
    const server = config.get<string>('launchScript')
    return server
}

/**
 * This uses the official python extension to grab the user's currently
 * configured environment.
 *
 * @returns The python interpreter to use to launch the server
 */
async function getPythonPath(resource?: vscode.Uri): Promise<string | undefined> {

    const config = vscode.workspace.getConfiguration("makrell.server", resource)
    const pythonPath = config.get<string>('pythonPath')
    if (pythonPath) {
        logger.info(`Using user configured python environment: '${pythonPath}'`)
        return pythonPath
    }

    if (!python) {
        return
    }

    if (resource) {
        logger.info(`Looking for environment in which to execute: '${resource.toString()}'`)
    }
    // Use whichever python interpreter the user has configured.
    const activeEnvPath = python.environments.getActiveEnvironmentPath(resource)
    logger.info(`Found environment: ${activeEnvPath.id}: ${activeEnvPath.path}`)

    const activeEnv = await python.environments.resolveEnvironment(activeEnvPath)
    if (!activeEnv) {
        logger.error(`Unable to resolve envrionment: ${activeEnvPath}`)
        return
    }

    const v = activeEnv.version
    const pythonVersion = semver.parse(`${v.major}.${v.minor}.${v.micro}`)

    // Check to see if the environment satisfies the min Python version.
    if (semver.lt(pythonVersion, MIN_PYTHON)) {
        const message = [
            `Your currently configured environment provides Python v${pythonVersion} `,
            `but pygls requires v${MIN_PYTHON}.\n\nPlease choose another environment.`
        ].join('')

        const response = await vscode.window.showErrorMessage(message, "Change Environment")
        if (!response) {
            return
        } else {
            await vscode.commands.executeCommand('python.setInterpreter')
            return
        }
    }

    const pythonUri = activeEnv.executable.uri
    if (!pythonUri) {
        logger.error(`URI of Python executable is undefined!`)
        return
    }

    return pythonUri.fsPath
}

async function getPythonExtension() {
    try {
        python = await PythonExtension.api();
    } catch (err) {
        logger.error(`Unable to load python extension: ${err}`)
    }
}