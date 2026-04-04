"use strict";

import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { execFile, spawn } from "child_process";
import { promisify } from "util";
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    State,
} from "vscode-languageclient/lib/node/main";

const execFileAsync = promisify(execFile);

type CommandResult = {
    stdout: string;
    stderr: string;
};

let client: LanguageClient | undefined;
let clientStarting = false;
let logger: vscode.LogOutputChannel;
let mrTerminal: vscode.Terminal | null = null;
let runTerminal: vscode.Terminal | null = null;
let cliDiagnostics: vscode.DiagnosticCollection;
let cliDiagnosticsWarningShown = false;

function isWindowsBatchCommand(command: string): boolean {
    if (os.platform() !== "win32") {
        return false;
    }

    const extension = path.extname(command).toLowerCase();
    return extension === ".cmd" || extension === ".bat";
}

function quotePowerShellArg(text: string): string {
    return `'${text.replace(/'/g, "''")}'`;
}

function getServerOptions(command: string, args: string[], cwd?: string): ServerOptions {
    if (!isWindowsBatchCommand(command)) {
        return {
            command,
            args,
            options: {
                ...(cwd ? { cwd } : {}),
            },
        };
    }

    const invocation = `& ${quotePowerShellArg(command)} ${args.map(quotePowerShellArg).join(" ")}`.trim();
    return {
        command: "powershell.exe",
        args: [
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            invocation,
        ],
        options: {
            ...(cwd ? { cwd } : {}),
            windowsHide: true,
        },
    };
}

async function runCommandCapture(command: string, args: string[], cwd?: string): Promise<CommandResult> {
    if (!isWindowsBatchCommand(command)) {
        return execFileAsync(command, args, { cwd }) as Promise<CommandResult>;
    }

    return await new Promise<CommandResult>((resolve, reject) => {
        const child = spawn(command, args, {
            cwd,
            shell: true,
            windowsHide: true,
        });

        let stdout = "";
        let stderr = "";

        child.stdout?.on("data", (chunk) => {
            stdout += chunk.toString();
        });
        child.stderr?.on("data", (chunk) => {
            stderr += chunk.toString();
        });
        child.on("error", (error) => {
            reject(error);
        });
        child.on("close", (code) => {
            if (code === 0) {
                resolve({ stdout, stderr });
                return;
            }

            const error = new Error(stderr.trim() || `Command failed with exit code ${code}`);
            (error as any).code = code;
            (error as any).stdout = stdout;
            (error as any).stderr = stderr;
            reject(error);
        });
    });
}

function getTerminalCommand(): string {
    switch (os.platform()) {
        case "win32":
            return "powershell.exe";
        case "darwin":
            return "/bin/zsh";
        case "linux":
            return "/bin/bash";
        default:
            return "/bin/bash";
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

function getWorkspaceCwd(document?: vscode.TextDocument): string | undefined {
    if (!document) {
        return undefined;
    }

    return vscode.workspace.getWorkspaceFolder(document.uri)?.uri.fsPath;
}

function quoteForShell(text: string): string {
    if (os.platform() === "win32") {
        return `'${text.replace(/'/g, "''")}'`;
    }

    return `'${text.replace(/'/g, "'\\''")}'`;
}

function buildTerminalInvocation(command: string, args: string[]): string {
    if (os.platform() === "win32") {
        return `& ${quoteForShell(command)}${args.length ? ` ${args.map(quoteForShell).join(" ")}` : ""}`;
    }

    return `${quoteForShell(command)}${args.length ? ` ${args.map(quoteForShell).join(" ")}` : ""}`;
}

function getRunCommandForDocument(document: vscode.TextDocument): string | undefined {
    const config = vscode.workspace.getConfiguration("makrell.run", document.uri);
    const extension = path.extname(document.fileName).toLowerCase();

    switch (extension) {
        case ".mrpy":
            return config.get<string>("pythonCommand", "makrell");
        case ".mrts":
            return config.get<string>("tsCommand", "makrellts");
        case ".mrsh":
            return config.get<string>("sharpCommand", "makrellsharp");
        default:
            return undefined;
    }
}

function getMakrellTsCommand(document: vscode.TextDocument): string {
    const config = vscode.workspace.getConfiguration("makrell.ts", document.uri);
    return config.get<string>("command", "makrellts");
}

function getMakrellSharpCommand(document: vscode.TextDocument): string {
    const config = vscode.workspace.getConfiguration("makrell.sharp", document.uri);
    return config.get<string>("command", "makrellsharp");
}

function getRunTerminal(): vscode.Terminal {
    const shellPath = getTerminalCommand();
    if (!runTerminal) {
        runTerminal = vscode.window.createTerminal({ name: "Makrell Run", shellPath });
    }
    return runTerminal;
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

    const selection = editor.selection;
    const codeToExecute = editor.document.getText(selection.isEmpty ? undefined : selection);
    mrTerminal.sendText(codeToExecute);
}

function isCliDiagnosticsDocument(document: vscode.TextDocument): boolean {
    if (document.uri.scheme !== "file") {
        return false;
    }

    return [".mrpy", ".mrts", ".mrsh", ".mron", ".mrml", ".mrtd"].includes(path.extname(document.fileName).toLowerCase());
}

function clearCliDiagnostics(document: vscode.TextDocument) {
    if (isCliDiagnosticsDocument(document)) {
        cliDiagnostics.delete(document.uri);
    }
}

function toVsCodeDiagnostic(item: any, defaultSource: string): vscode.Diagnostic {
    const startLine = Math.max((item.range?.start?.line ?? 1) - 1, 0);
    const startColumn = Math.max((item.range?.start?.column ?? 1) - 1, 0);
    const endLine = Math.max((item.range?.end?.line ?? item.range?.start?.line ?? 1) - 1, startLine);
    const endColumn = Math.max((item.range?.end?.column ?? item.range?.start?.column ?? 1) - 1, startColumn);
    const range = new vscode.Range(startLine, startColumn, endLine, endColumn);

    const severity = (() => {
        switch (item.severity) {
            case "warning":
                return vscode.DiagnosticSeverity.Warning;
            case "information":
                return vscode.DiagnosticSeverity.Information;
            case "hint":
                return vscode.DiagnosticSeverity.Hint;
            default:
                return vscode.DiagnosticSeverity.Error;
        }
    })();

    const diagnostic = new vscode.Diagnostic(range, item.message ?? "Makrell diagnostic", severity);
    diagnostic.code = item.code;
    diagnostic.source = item.phase ? `${defaultSource}/${item.phase}` : defaultSource;
    return diagnostic;
}

function isMakrellSharpDocument(document: vscode.TextDocument): boolean {
    return document.uri.scheme === "file" && path.extname(document.fileName).toLowerCase() === ".mrsh";
}

function isMakrellTsDocument(document: vscode.TextDocument): boolean {
    return document.uri.scheme === "file" && path.extname(document.fileName).toLowerCase() === ".mrts";
}

function isMakrellPyDocument(document: vscode.TextDocument): boolean {
    const extension = path.extname(document.fileName).toLowerCase();
    return document.uri.scheme === "file" && extension === ".mrpy";
}

function isMronDocument(document: vscode.TextDocument): boolean {
    return document.uri.scheme === "file" && path.extname(document.fileName).toLowerCase() === ".mron";
}

function isMrmlDocument(document: vscode.TextDocument): boolean {
    return document.uri.scheme === "file" && path.extname(document.fileName).toLowerCase() === ".mrml";
}

function isMrtdDocument(document: vscode.TextDocument): boolean {
    return document.uri.scheme === "file" && path.extname(document.fileName).toLowerCase() === ".mrtd";
}

function getCliCheckCommand(document: vscode.TextDocument): string[] | undefined {
    const extension = path.extname(document.fileName).toLowerCase();
    switch (extension) {
        case ".mrpy":
            return ["check", document.fileName, "--json"];
        case ".mrts":
            return ["check", document.fileName, "--json"];
        case ".mrsh":
            return ["check", document.fileName, "--json"];
        case ".mron":
            return ["check-mron", document.fileName, "--json"];
        case ".mrml":
            return ["check-mrml", document.fileName, "--json"];
        case ".mrtd":
            return ["check-mrtd", document.fileName, "--json"];
        default:
            return undefined;
    }
}

function getCliDiagnosticsConfiguration(document: vscode.TextDocument): { command: string; diagnosticsEnabled: boolean; warningMessage: string } {
    if (isMakrellPyDocument(document)) {
        const config = vscode.workspace.getConfiguration("makrell.python", document.uri);
        return {
            command: config.get<string>("command", "makrell"),
            diagnosticsEnabled: config.get<boolean>("diagnosticsEnabled", true),
            warningMessage: "MakrellPy diagnostics require `makrell` on PATH or configured via `makrell.python.command`.",
        };
    }

    if (isMakrellTsDocument(document)) {
        const config = vscode.workspace.getConfiguration("makrell.ts", document.uri);
        return {
            command: config.get<string>("command", "makrellts"),
            diagnosticsEnabled: config.get<boolean>("diagnosticsEnabled", true),
            warningMessage: "MakrellTS diagnostics require `makrellts` on PATH or configured via `makrell.ts.command`.",
        };
    }

    const config = vscode.workspace.getConfiguration("makrell.sharp", document.uri);
    return {
        command: config.get<string>("command", "makrellsharp"),
        diagnosticsEnabled: config.get<boolean>("diagnosticsEnabled", true),
        warningMessage: "Makrell# and family-format diagnostics require `makrellsharp` on PATH or configured via `makrell.sharp.command`.",
    };
}

async function validateCliDiagnosticsDocument(document: vscode.TextDocument, showErrors = false) {
    if (!isCliDiagnosticsDocument(document)) {
        return;
    }

    const config = getCliDiagnosticsConfiguration(document);
    if (!config.diagnosticsEnabled) {
        cliDiagnostics.delete(document.uri);
        return;
    }

    if (document.isDirty) {
        cliDiagnostics.delete(document.uri);
        return;
    }

    const checkArgs = getCliCheckCommand(document);
    if (!checkArgs) {
        cliDiagnostics.delete(document.uri);
        return;
    }
    const cwd = getWorkspaceCwd(document);

    try {
        const { stdout, stderr } = await runCommandCapture(
            config.command,
            checkArgs,
            cwd,
        );

        if (stderr?.trim()) {
            logger.warn(stderr.trim());
        }

        const defaultSource = isMakrellPyDocument(document)
            ? "makrell"
            : isMakrellTsDocument(document)
                ? "makrellts"
                : "makrellsharp";
        const parsed = JSON.parse(stdout);
        const diagnostics = Array.isArray(parsed?.diagnostics)
            ? parsed.diagnostics.map((item: any) => toVsCodeDiagnostic(item, defaultSource))
            : [];
        cliDiagnostics.set(document.uri, diagnostics);
    } catch (error: any) {
        cliDiagnostics.delete(document.uri);
        logger.error(`Makrell CLI diagnostics failed: ${String(error)}`);
        if (showErrors && !cliDiagnosticsWarningShown) {
            cliDiagnosticsWarningShown = true;
            void vscode.window.showWarningMessage(config.warningMessage);
        }
    }
}

async function runCurrentFile() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        await vscode.window.showWarningMessage("No open text editor.");
        return;
    }

    const document = editor.document;
    if (document.uri.scheme !== "file") {
        await vscode.window.showWarningMessage("Current file must be saved before it can be run.");
        return;
    }

    if (document.isDirty) {
        const saved = await document.save();
        if (!saved) {
            return;
        }
    }

    const command = getRunCommandForDocument(document);
    if (!command) {
        await vscode.window.showWarningMessage("This file type does not have a configured run command.");
        return;
    }

    const terminal = getRunTerminal();
    terminal.show(true);
    terminal.sendText(buildTerminalInvocation(command, [document.fileName]));
}

async function getSavedActiveDocument(
    predicate: (document: vscode.TextDocument) => boolean,
    warningMessage: string,
): Promise<vscode.TextDocument | undefined> {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !predicate(editor.document)) {
        await vscode.window.showWarningMessage(warningMessage);
        return undefined;
    }

    if (editor.document.uri.scheme !== "file") {
        await vscode.window.showWarningMessage("Current file must be saved before this command can run.");
        return undefined;
    }

    if (editor.document.isDirty) {
        const saved = await editor.document.save();
        if (!saved) {
            return undefined;
        }
    }

    return editor.document;
}

async function openGeneratedPreview(content: string, language: string): Promise<void> {
    const document = await vscode.workspace.openTextDocument({ content, language });
    await vscode.window.showTextDocument(document, { preview: true });
}

async function emitCurrentMakrellTsFile() {
    const document = await getSavedActiveDocument(
        isMakrellTsDocument,
        "Open a MakrellTS (.mrts) file first.",
    );
    if (!document) {
        return;
    }

    const command = getMakrellTsCommand(document);
    const cwd = getWorkspaceCwd(document);

    try {
        const { stdout, stderr } = await runCommandCapture(command, [document.fileName, "--emit-js"], cwd);
        if (stderr?.trim()) {
            logger.warn(stderr.trim());
        }

        await openGeneratedPreview(stdout, "javascript");
    } catch (error: any) {
        logger.error(`MakrellTS emit JS failed: ${String(error)}`);
        await vscode.window.showErrorMessage("Unable to emit generated JavaScript for the current MakrellTS file.");
    }
}

async function buildCurrentMakrellSharpFile() {
    const document = await getSavedActiveDocument(
        isMakrellSharpDocument,
        "Open a Makrell# (.mrsh) file first.",
    );
    if (!document) {
        return;
    }

    const command = getMakrellSharpCommand(document);
    const cwd = getWorkspaceCwd(document);

    try {
        const { stdout, stderr } = await runCommandCapture(command, ["build", document.fileName], cwd);
        if (stderr?.trim()) {
            logger.warn(stderr.trim());
        }

        const outputPath = stdout.trim();
        if (outputPath) {
            await vscode.window.showInformationMessage(`Makrell# assembly built: ${outputPath}`);
            return;
        }

        await vscode.window.showInformationMessage("Makrell# assembly built.");
    } catch (error: any) {
        logger.error(`Makrell# build failed: ${String(error)}`);
        await vscode.window.showErrorMessage("Unable to build the current Makrell# file.");
    }
}

function getDefaultMakrellSharpAssemblyPath(document: vscode.TextDocument): string {
    const parsed = path.parse(document.fileName);
    return path.join(parsed.dir, `${parsed.name}.dll`);
}

async function buildMakrellSharpFile(document: vscode.TextDocument): Promise<string> {
    const command = getMakrellSharpCommand(document);
    const cwd = getWorkspaceCwd(document);
    const { stdout, stderr } = await runCommandCapture(command, ["build", document.fileName], cwd);
    if (stderr?.trim()) {
        logger.warn(stderr.trim());
    }

    return stdout.trim() || getDefaultMakrellSharpAssemblyPath(document);
}

async function emitCSharpCurrentMakrellSharpFile() {
    const document = await getSavedActiveDocument(
        isMakrellSharpDocument,
        "Open a Makrell# (.mrsh) file first.",
    );
    if (!document) {
        return;
    }

    const command = getMakrellSharpCommand(document);
    const cwd = getWorkspaceCwd(document);

    try {
        const { stdout, stderr } = await runCommandCapture(command, ["emit-csharp", document.fileName], cwd);
        if (stderr?.trim()) {
            logger.warn(stderr.trim());
        }

        await openGeneratedPreview(stdout, "csharp");
    } catch (error: any) {
        logger.error(`Makrell# emit C# failed: ${String(error)}`);
        await vscode.window.showErrorMessage("Unable to emit generated C# for the current Makrell# file.");
    }
}

async function runBuiltAssemblyCurrentMakrellSharpFile() {
    const document = await getSavedActiveDocument(
        isMakrellSharpDocument,
        "Open a Makrell# (.mrsh) file first.",
    );
    if (!document) {
        return;
    }

    try {
        const assemblyPath = await buildMakrellSharpFile(document);
        const command = getMakrellSharpCommand(document);
        const cwd = getWorkspaceCwd(document);
        const { stdout, stderr } = await runCommandCapture(command, ["run-assembly", assemblyPath], cwd);
        if (stderr?.trim()) {
            logger.warn(stderr.trim());
        }

        await openGeneratedPreview(stdout, "plaintext");
    } catch (error: any) {
        logger.error(`Makrell# run assembly failed: ${String(error)}`);
        await vscode.window.showErrorMessage("Unable to run the built assembly for the current Makrell# file.");
    }
}

async function showMetaSourcesCurrentMakrellSharpFile() {
    const document = await getSavedActiveDocument(
        isMakrellSharpDocument,
        "Open a Makrell# (.mrsh) file first.",
    );
    if (!document) {
        return;
    }

    try {
        const assemblyPath = await buildMakrellSharpFile(document);
        const command = getMakrellSharpCommand(document);
        const cwd = getWorkspaceCwd(document);
        const { stdout, stderr } = await runCommandCapture(command, ["meta-sources", assemblyPath], cwd);
        if (stderr?.trim()) {
            logger.warn(stderr.trim());
        }

        await openGeneratedPreview(stdout, "plaintext");
    } catch (error: any) {
        logger.error(`Makrell# meta sources failed: ${String(error)}`);
        await vscode.window.showErrorMessage("Unable to show compile-time meta sources for the current Makrell# file.");
    }
}

async function parseCurrentFamilyFormat(
    predicate: (document: vscode.TextDocument) => boolean,
    warningMessage: string,
    parseCommand: string,
    previewLanguage: string,
) {
    const document = await getSavedActiveDocument(predicate, warningMessage);
    if (!document) {
        return;
    }

    const command = getMakrellSharpCommand(document);
    const cwd = getWorkspaceCwd(document);

    try {
        const { stdout, stderr } = await runCommandCapture(command, [parseCommand, document.fileName], cwd);
        if (stderr?.trim()) {
            logger.warn(stderr.trim());
        }

        await openGeneratedPreview(stdout, previewLanguage);
    } catch (error: any) {
        logger.error(`Makrell family parse failed (${parseCommand}): ${String(error)}`);
        await vscode.window.showErrorMessage(`Unable to parse the current file with \`${parseCommand}\`.`);
    }
}

async function parseCurrentMronFile() {
    await parseCurrentFamilyFormat(
        isMronDocument,
        "Open an MRON (.mron) file first.",
        "parse-mron",
        "json",
    );
}

async function parseCurrentMrmlFile() {
    await parseCurrentFamilyFormat(
        isMrmlDocument,
        "Open an MRML (.mrml) file first.",
        "parse-mrml",
        "xml",
    );
}

async function parseCurrentMrtdFile() {
    await parseCurrentFamilyFormat(
        isMrtdDocument,
        "Open an MRTD (.mrtd) file first.",
        "parse-mrtd",
        "json",
    );
}

async function checkCurrentMakrellSharpFile() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !isMakrellSharpDocument(editor.document)) {
        await vscode.window.showWarningMessage("Open a Makrell# (.mrsh) file first.");
        return;
    }

    if (editor.document.isDirty) {
        const saved = await editor.document.save();
        if (!saved) {
            return;
        }
    }

    await validateCliDiagnosticsDocument(editor.document, true);
}

async function checkCurrentMakrellTsFile() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !isMakrellTsDocument(editor.document)) {
        await vscode.window.showWarningMessage("Open a MakrellTS (.mrts) file first.");
        return;
    }

    if (editor.document.isDirty) {
        const saved = await editor.document.save();
        if (!saved) {
            return;
        }
    }

    await validateCliDiagnosticsDocument(editor.document, true);
}

async function checkCurrentMakrellPyFile() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !isMakrellPyDocument(editor.document)) {
        await vscode.window.showWarningMessage("Open a MakrellPy (.mrpy) file first.");
        return;
    }

    if (editor.document.isDirty) {
        const saved = await editor.document.save();
        if (!saved) {
            return;
        }
    }

    await validateCliDiagnosticsDocument(editor.document, true);
}

function getSupportedLanguages(): string[] {
    return ["makrell", "makrell-on", "makrell-ml", "makrell-td"];
}

function shouldHandleDocument(document: vscode.TextDocument): boolean {
    if (document.uri.scheme !== "file") {
        return false;
    }
    return getSupportedLanguages().includes(document.languageId);
}

function getDefaultDocumentSelector() {
    return getSupportedLanguages().map((language) => ({
        scheme: "file",
        language,
    }));
}

function getServerEnabled(): boolean {
    const config = vscode.workspace.getConfiguration("makrell.server");
    return config.get<boolean>("enabled", true);
}

function getServerCommand(): string {
    const config = vscode.workspace.getConfiguration("makrell.server");
    return config.get<string>("command", "makrell-family-lsp");
}

function getServerArgs(): string[] {
    const config = vscode.workspace.getConfiguration("makrell.server");
    return config.get<string[]>("args", []);
}

function getServerCwd(): string | undefined {
    const config = vscode.workspace.getConfiguration("makrell.server");
    return config.get<string>("cwd");
}

function getClientOptions(): LanguageClientOptions {
    const config = vscode.workspace.getConfiguration("makrell.client");
    const documentSelector =
        config.get<any[]>("documentSelector") ?? getDefaultDocumentSelector();
    const options = {
        documentSelector,
        outputChannel: logger,
        connectionOptions: {
            maxRestartCount: 0,
        },
    };
    logger.info(`client options: ${JSON.stringify(options, undefined, 2)}`);
    return options;
}

async function startLangServer(showErrors = false) {
    if (!getServerEnabled()) {
        logger.info("Makrell language server disabled by configuration.");
        return;
    }

    if (clientStarting) {
        return;
    }

    clientStarting = true;
    if (client) {
        await stopLangServer();
    }

    const command = getServerCommand();
    const args = getServerArgs();
    const cwd = getServerCwd();

    logger.info(`server command: '${command}'`);
    logger.info(`server args: ${JSON.stringify(args)}`);
    logger.info(`server cwd: '${cwd ?? "<default>"}'`);

    const serverOptions = getServerOptions(command, args, cwd);

    client = new LanguageClient(
        "makrell",
        "Makrell Language Server",
        serverOptions,
        getClientOptions(),
    );

    try {
        await client.start();
        logger.info("Makrell language server started.");
    } catch (err) {
        logger.error(`Unable to start Makrell language server: ${String(err)}`);
        client?.dispose();
        client = undefined;
        if (showErrors) {
            void vscode.window.showWarningMessage(
                "Makrell language server is not available. Editor support still works, but hover, go-to, completions, and richer diagnostics need `makrell-family-lsp` on PATH or configured via settings.",
            );
        }
    } finally {
        clientStarting = false;
    }
}

async function stopLangServer(): Promise<void> {
    if (!client) {
        return;
    }

    if (client.state === State.Running) {
        await client.stop();
    }

    client.dispose();
    client = undefined;
}

async function executeServerCommand() {
    if (!client || client.state !== State.Running) {
        await vscode.window.showErrorMessage("There is no Makrell language server running.");
        return;
    }

    const knownCommands = client.initializeResult?.capabilities.executeCommandProvider?.commands;
    if (!knownCommands || knownCommands.length === 0) {
        const info = client.initializeResult?.serverInfo;
        const name = info?.name || "Server";
        const version = info?.version || "";
        await vscode.window.showInformationMessage(
            `${name} ${version}`.trim() + " does not implement any commands.",
        );
        return;
    }

    const commandName = await vscode.window.showQuickPick(knownCommands, { canPickMany: false });
    if (!commandName) {
        return;
    }

    logger.info(`executing command: '${commandName}'`);
    const result = await vscode.commands.executeCommand(commandName);
    logger.info(`${commandName} result: ${JSON.stringify(result, undefined, 2)}`);
}

export async function activate(context: vscode.ExtensionContext) {
    logger = vscode.window.createOutputChannel("Makrell", { log: true });
    logger.info("Makrell extension activated.");
    cliDiagnostics = vscode.languages.createDiagnosticCollection("makrell");

    context.subscriptions.push(
        cliDiagnostics,
        vscode.commands.registerCommand("makrell.server.restart", async () => {
            logger.info("Restarting Makrell language server...");
            await startLangServer(true);
        }),
        vscode.commands.registerCommand("makrell.server.executeCommand", async () => {
            await executeServerCommand();
        }),
        vscode.commands.registerCommand("makrell.server.startRepl", startRepl),
        vscode.commands.registerCommand("makrell.server.sendToRepl", sendCodeToRepl),
        vscode.commands.registerCommand("makrell.server.stopRepl", stopRepl),
        vscode.commands.registerCommand("makrell.runCurrentFile", async () => {
            await runCurrentFile();
        }),
        vscode.commands.registerCommand("makrell.python.checkCurrentFile", async () => {
            await checkCurrentMakrellPyFile();
        }),
        vscode.commands.registerCommand("makrell.ts.checkCurrentFile", async () => {
            await checkCurrentMakrellTsFile();
        }),
        vscode.commands.registerCommand("makrell.ts.emitCurrentFile", async () => {
            await emitCurrentMakrellTsFile();
        }),
        vscode.commands.registerCommand("makrell.sharp.checkCurrentFile", async () => {
            await checkCurrentMakrellSharpFile();
        }),
        vscode.commands.registerCommand("makrell.sharp.buildCurrentFile", async () => {
            await buildCurrentMakrellSharpFile();
        }),
        vscode.commands.registerCommand("makrell.sharp.emitCSharpCurrentFile", async () => {
            await emitCSharpCurrentMakrellSharpFile();
        }),
        vscode.commands.registerCommand("makrell.sharp.runBuiltAssemblyCurrentFile", async () => {
            await runBuiltAssemblyCurrentMakrellSharpFile();
        }),
        vscode.commands.registerCommand("makrell.sharp.showMetaSourcesCurrentFile", async () => {
            await showMetaSourcesCurrentMakrellSharpFile();
        }),
        vscode.commands.registerCommand("makrell.family.parseCurrentMronFile", async () => {
            await parseCurrentMronFile();
        }),
        vscode.commands.registerCommand("makrell.family.parseCurrentMrmlFile", async () => {
            await parseCurrentMrmlFile();
        }),
        vscode.commands.registerCommand("makrell.family.parseCurrentMrtdFile", async () => {
            await parseCurrentMrtdFile();
        }),
        vscode.commands.registerCommand("makrell.openDocs", async () => {
            await vscode.env.openExternal(vscode.Uri.parse("https://makrell.dev/"));
        }),
        vscode.commands.registerCommand("makrell.openRepo", async () => {
            await vscode.env.openExternal(vscode.Uri.parse("https://github.com/hcholm/makrell-omni"));
        }),
        vscode.window.onDidCloseTerminal((terminal) => {
            if (terminal === mrTerminal) {
                mrTerminal = null;
            }
            if (terminal === runTerminal) {
                runTerminal = null;
            }
        }),
        vscode.workspace.onDidChangeConfiguration(async (event) => {
            if (
                event.affectsConfiguration("makrell.server")
                || event.affectsConfiguration("makrell.client")
                || event.affectsConfiguration("makrell.python")
                || event.affectsConfiguration("makrell.ts")
                || event.affectsConfiguration("makrell.sharp")
            ) {
                logger.info("Makrell configuration changed, restarting language server...");
                await startLangServer(true);
                for (const editor of vscode.window.visibleTextEditors) {
                    if (isCliDiagnosticsDocument(editor.document)) {
                        await validateCliDiagnosticsDocument(editor.document);
                    }
                }
            }
        }),
        vscode.workspace.onDidOpenTextDocument(async (document) => {
            if (!client && shouldHandleDocument(document)) {
                await startLangServer();
            }
            if (isCliDiagnosticsDocument(document)) {
                await validateCliDiagnosticsDocument(document);
            }
        }),
        vscode.workspace.onDidSaveTextDocument(async (document) => {
            if (isCliDiagnosticsDocument(document)) {
                await validateCliDiagnosticsDocument(document);
            }
        }),
        vscode.workspace.onDidChangeTextDocument((event) => {
            if (isCliDiagnosticsDocument(event.document)) {
                clearCliDiagnostics(event.document);
            }
        }),
        vscode.workspace.onDidCloseTextDocument((document) => {
            clearCliDiagnostics(document);
        }),
        vscode.workspace.onDidOpenNotebookDocument(async () => {
            if (!client) {
                await startLangServer();
            }
        }),
    );

    if (vscode.window.visibleTextEditors.some((editor) => shouldHandleDocument(editor.document))) {
        await startLangServer();
    }

    for (const editor of vscode.window.visibleTextEditors) {
        if (isCliDiagnosticsDocument(editor.document)) {
            await validateCliDiagnosticsDocument(editor.document);
        }
    }
}

export function deactivate(): Thenable<void> {
    if (mrTerminal) {
        mrTerminal.dispose();
        mrTerminal = null;
    }
    if (runTerminal) {
        runTerminal.dispose();
        runTerminal = null;
    }
    return stopLangServer();
}
