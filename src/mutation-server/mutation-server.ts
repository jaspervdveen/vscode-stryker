import { ProgressLocation, window } from "vscode";
import { config } from "../config.js";
import { Logger } from "../utils/logger.js";
import { JSONRPCClient, JSONRPCRequest, JSONRPCResponse, TypedJSONRPCClient } from "json-rpc-2.0";
import { WebSocket, Data } from 'ws';
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { MutationServerMethods } from "./mutation-server-methods.js";
import * as vscode from 'vscode';
import { MutantResult } from "../api/mutant-result.js";

export class MutationServer {
    private process: ChildProcessWithoutNullStreams;
    private rpcClient: TypedJSONRPCClient<MutationServerMethods> | undefined;
    private webSocket: WebSocket | undefined;

    constructor(private logger: Logger) {
        // Start the mutation server
        const workspaceConfig = vscode.workspace.getConfiguration(config.app.name);

        const mutationServerExecutablePath: string | undefined = workspaceConfig.get('mutationServerExecutablePath');

        if (!mutationServerExecutablePath) {
            logger.logError(config.errors.mutationServerExecutablePathNotSet);
            throw new Error(config.errors.mutationServerExecutablePathNotSet);
        };

        const mutationServerPort = workspaceConfig.get('mutationServerPort') ?? 8080;
        const args = ['--port', mutationServerPort.toString()];

        this.process = spawn(mutationServerExecutablePath, args, { cwd: vscode.workspace.workspaceFolders![0].uri.fsPath });

        if (this.process.pid === undefined) {
            logger.logError(`[Mutation Server] Failed to start mutation server with executable path: ${mutationServerExecutablePath} `
                + `and port: ${mutationServerPort}. These properties can be configured in the extension settings, then reload the window.`);
            throw new Error(config.errors.mutationServerFailed);
        }

        this.process.on('exit', (code) => {
            logger.logInfo(`[Mutation Server] Exited with code ${code}`);
        });

        this.process.stdout.on('data', (data) => {
            logger.logInfo(`[Mutation Server] ${data.toString()}`);
        });

        this.process.stderr.on('data', (data) => {
            logger.logError(`[Mutation Server] ${data.toString()}`);
        });
    }

    public async connect() {
        await this.waitForMutationServerStarted();
        this.connectViaWebSocket();

        this.rpcClient = new JSONRPCClient(async (jsonRpcRequest: JSONRPCRequest) => {
            await this.waitForOpenSocket(this.webSocket!);
            this.webSocket!.send(JSON.stringify(jsonRpcRequest));
        });
    }

    public async instrument(globPatterns?: string[]): Promise<MutantResult[]> {
        return await window.withProgress({
            location: ProgressLocation.Window,
            title: config.messages.instrumentationRunning,
        }, async () => {
            if (!this.rpcClient) {
                throw new Error('Setup method not called.');
            }

            const result = await this.rpcClient.request('instrument', { globPatterns: globPatterns });

            return result;
        });
    }

    public async mutate(globPatterns?: string[]): Promise<MutantResult[]> {
        return await window.withProgress({
            location: ProgressLocation.Window,
            title: config.messages.mutationTestingRunning,
            cancellable: true
        }, async () => {
            if (!this.rpcClient) {
                throw new Error('Setup method not called.');
            }

            const result = await this.rpcClient.request('mutate', { globPatterns: globPatterns });

            return result;
        });
    }

    private connectViaWebSocket() {
        const workspaceConfig = vscode.workspace.getConfiguration(config.app.name);
        const mutationServerPort: number | undefined = workspaceConfig.get('mutationServerPort');

        if (!mutationServerPort) {
            this.logger.logError(config.errors.mutationServerPortNotSet);
            throw new Error(config.errors.mutationServerPortNotSet);
        }

        this.webSocket = new WebSocket(`ws://localhost:${mutationServerPort}`);

        this.webSocket.on('message', (data: Data) => {
            let response: JSONRPCResponse | undefined;

            try {
                response = JSON.parse(data.toString());
            } catch (error) {
                this.logger.logError(`Error parsing JSON: ${data.toString()}`);
            }

            if (response) {
                this.rpcClient!.receive(response);
            }
        });

        this.webSocket.on('error', (err) => {
            this.logger.logError(`WebSocket Error: ${err}`);
            this.logger.errorNotification(config.errors.mutationServerFailed);
        });
    };

    private waitForOpenSocket = (socket: WebSocket): Promise<void> => {
        return new Promise<void>((resolve) => {
            if (socket.readyState !== socket.OPEN) {
                socket.on("open", () => {
                    resolve();
                });
            } else {
                resolve();
            }
        });
    };

    private waitForMutationServerStarted = async (): Promise<void> => {
        await new Promise<void>((resolve) => {
            this.process.stdout.on('data', (data) => {
                if (data.toString().includes('Server started')) {
                    resolve();
                }
            });
        });
    };
}