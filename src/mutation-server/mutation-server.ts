import { ProgressLocation, window } from "vscode";
import { Config } from "../config.js";
import { reporterUtils } from "../utils/reporter-utils.js";
import { JSONRPCClient, JSONRPCRequest, JSONRPCResponse, TypedJSONRPCClient } from "json-rpc-2.0";
import { WebSocket, Data } from 'ws';
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { MutationTestResult } from "mutation-testing-report-schema";
import { MutationServerMethods } from "./mutation-server-methods.js";

export class MutationServer {
    private process: ChildProcessWithoutNullStreams;
    private rpcClient: TypedJSONRPCClient<MutationServerMethods> | undefined;
    private webSocket: WebSocket | undefined;
    
    constructor() {
        // Start the mutation server
        this.process = spawn(Config.app.mutationServerExecutable, { cwd: Config.app.currentWorkingDirectory });
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
            title: Config.messages.instrumentationRunning,
        }, async () => {
            try {
                if (!this.rpcClient) {
                    throw new Error('Setup method not called.');
                }

                const result = await this.rpcClient.request('instrument', { globPatterns: globPatterns });

                return result;
            } catch (error) {
                reporterUtils.errorNotification(Config.errors.instrumentationFailed);
                throw error;
            }
        });
    }

    private connectViaWebSocket() {
        this.webSocket = new WebSocket(Config.app.mutationServerAddress);

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