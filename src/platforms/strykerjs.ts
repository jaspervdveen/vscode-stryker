import { ProgressLocation, window } from "vscode";
import { Platform } from "./platform.js";
import { MutantResult, MutationTestResult } from "mutation-testing-report-schema";
import { config } from "../config.js";
import { reporterUtils } from "../utils/reporter-utils.js";
import { JSONRPCClient, JSONRPCRequest, JSONRPCResponse, TypedJSONRPCClient } from "json-rpc-2.0";
import { WebSocket, Data } from 'ws';
import { ChildProcessWithoutNullStreams, spawn } from "child_process";

type Methods = {
    instrument(params: { globPatterns?: string[] }): MutantResult[];
};

export class StrykerJs implements Platform {

    private strykerProcess: ChildProcessWithoutNullStreams;
    private rpcClient: TypedJSONRPCClient<Methods> | undefined;
    private webSocket: WebSocket | undefined;
    private processStarted: boolean = false;
    
    constructor() {
        const executable = '/home/jasper/repos/stryker-js/packages/core/bin/stryker-server.js';

        this.strykerProcess = spawn(executable, { cwd: config.app.currentWorkingDirectory });
    }

    public async setup() {
        await this.waitForProcessStarted();
        this.setupWebSocketConnection();

        this.rpcClient = new JSONRPCClient(async (jsonRpcRequest: JSONRPCRequest) => {
            await this.waitForOpenSocket(this.webSocket!);
            this.webSocket!.send(JSON.stringify(jsonRpcRequest));
        });
    }

    private setupWebSocketConnection() {
        const wsUrl = 'ws://localhost:8080';

        this.webSocket = new WebSocket(wsUrl);

        this.webSocket.on('open', () => {
            console.log('WebSocket connection established.');
        });

        this.webSocket.on('message', (data: Data) => {
            let response: JSONRPCResponse | undefined;

            try {
                response = JSON.parse(data.toString());
            } catch (error) {
                console.log('Error parsing JSON: ', data.toString());
            }

            if (response) {
                this.rpcClient!.receive(response);
            }
        });

        this.webSocket.on('close', () => {
            console.log('Connection closed.');
        });

        this.webSocket.on('error', (err) => {
            console.error('WebSocket Error:', err);
        });
    };

    async instrumentationRun(globPatterns?: string[]): Promise<MutationTestResult> {
        return await window.withProgress({
            location: ProgressLocation.Window,
            title: config.messages.instrumentationRunning,
        }, async () => {
            try {
                if (!this.rpcClient) {
                    throw new Error('Setup method not called.');
                }

                const result = await this.rpcClient.request('instrument', { globPatterns: globPatterns });
                return {} as MutationTestResult;
            } catch (error) {
                reporterUtils.errorNotification(config.errors.instrumentationFailed);
                throw error;
            }
        });
    }

    async mutationTestingRun(globPatterns?: string[]): Promise<MutationTestResult> {
        throw new Error('Mutation testing is not implemented yet');
    }

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

    private waitForProcessStarted = async (): Promise<void> => {
        await new Promise<void>((resolve) => {
            this.strykerProcess.stdout.on('data', (data) => {
                if (data.toString().includes('Server started')) {
                    resolve();
                }
            });
        });
    };  
}
