import { ProgressLocation, window } from "vscode";
import { config } from "../config.js";
import { reporterUtils } from "../utils/reporter-utils.js";
import { JSONRPCClient, JSONRPCRequest, JSONRPCResponse, TypedJSONRPCClient } from "json-rpc-2.0";
import { WebSocket, Data } from 'ws';
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { MutationTestResult } from "mutation-testing-report-schema";
import { MutationServerMethods } from "./mutation-server-methods.js";
import * as vscode from 'vscode';

export class MutationServer {
    private process: ChildProcessWithoutNullStreams;
    private rpcClient: TypedJSONRPCClient<MutationServerMethods> | undefined;
    private webSocket: WebSocket | undefined;
    
    constructor() {
        // Start the mutation server
        const workspaceConfig = vscode.workspace.getConfiguration(config.app.name);

        const mutationServerExecutablePath: string | undefined = workspaceConfig.get('mutationServerExecutablePath');

        if (!mutationServerExecutablePath) {
            throw new Error(config.errors.mutationServerExecutablePathNotSet);
        };

        const mutationServerPort = workspaceConfig.get('mutationServerPort') ?? 8080;
        const args = ['--port', mutationServerPort.toString()];
        
        this.process = spawn(mutationServerExecutablePath, args, { cwd: vscode.workspace.workspaceFolders![0].uri.fsPath });
    }

    public async connect() {
        await this.waitForMutationServerStarted();
        this.connectViaWebSocket();

        this.rpcClient = new JSONRPCClient(async (jsonRpcRequest: JSONRPCRequest) => {
            await this.waitForOpenSocket(this.webSocket!);
            this.webSocket!.send(JSON.stringify(jsonRpcRequest));
        });
    }

    public async instrument(globPatterns?: string[]): Promise<MutationTestResult> {
        return await window.withProgress({
            location: ProgressLocation.Window,
            title: config.messages.instrumentationRunning,
        }, async () => {
            try {
                if (!this.rpcClient) {
                    throw new Error('Setup method not called.');
                }

                const result = await this.rpcClient.request('instrument', { globPatterns: globPatterns });

                return result;
            } catch (error) {
                reporterUtils.errorNotification(config.errors.instrumentationFailed);
                throw error;
            }
        });
    }

    private connectViaWebSocket() {
        const workspaceConfig = vscode.workspace.getConfiguration(config.app.name);
        const mutationServerPort: number | undefined = workspaceConfig.get('mutationServerPort');

        if (!mutationServerPort) {
            throw new Error(config.errors.mutationServerPortNotSet);
        }

        this.webSocket = new WebSocket(`ws://localhost:${mutationServerPort}`);

        this.webSocket.on('message', (data: Data) => {
            let response: JSONRPCResponse | undefined;

            try {
                response = JSON.parse(data.toString());
            } catch (error) {
                console.error('Error parsing JSON: ', data.toString());
            }

            if (response) {
                this.rpcClient!.receive(response);
            }
        });

        this.webSocket.on('error', (err) => {
            console.error('WebSocket Error:', err);
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