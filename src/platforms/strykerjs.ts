import { ProgressLocation, window } from "vscode";
import { Platform } from "./platform.js";
import { MutantResult, MutationTestResult } from "mutation-testing-report-schema";
import { config } from "../config.js";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { reporterUtils } from "../utils/reporter-utils.js";
import { JSONRPCClient, JSONRPCRequest, JSONRPCResponse, TypedJSONRPCClient } from "json-rpc-2.0";
import * as net from 'net';

type Methods = {
    instrument(params: { globPatterns?: string[] }): MutantResult[];
};

export class StrykerJs implements Platform {

    private rpcClient: TypedJSONRPCClient<Methods>;
    private socket: net.Socket;

    constructor() {
        const executable = '/home/jasper/repos/stryker-js/packages/core/bin/stryker-server.js';

        const strykerServer = spawn(executable, { cwd: config.app.currentWorkingDirectory });

        this.socket = net.createConnection({ port: 8080 });

        this.rpcClient = new JSONRPCClient((jsonRpcRequest: JSONRPCRequest) => {
            this.socket.write(JSON.stringify(jsonRpcRequest) + '\n');
        });

        this.socket.on('data', (data: Buffer) => {
            let response: JSONRPCResponse | undefined;

            try {
                response = JSON.parse(data.toString());
            } catch (error) {
                console.log('Error parsing JSON: ', data.toString());
            }

            if (response) {
                this.rpcClient.receive(response);
            }
        });

        this.socket.on('close', () => {
            console.log('Connection closed.');
        });

        this.socket.on('error', (err) => {
            console.error('Socket Error:', err);
        });
    }

    async instrumentationRun(globPatterns?: string[]): Promise<MutationTestResult> {
        return await window.withProgress({
            location: ProgressLocation.Window,
            title: config.messages.instrumentationRunning,
        }, async () => {
            try {
                const result = await this.rpcClient.request('instrument', { globPatterns: globPatterns });

                return {} as MutationTestResult;
            } catch (error) {
                reporterUtils.errorNotification(config.errors.instrumentationFailed);
                throw new Error(config.errors.instrumentationFailed);
            }
        });
    }

    async mutationTestingRun(globPatterns?: string[]): Promise<MutationTestResult> {
        let args: string[] = [
            'run',
            '--fileLogLevel', 'trace',
            '--reporters', 'json'
        ];

        if (globPatterns) {
            args.push('--mutate', globPatterns.join(','));
        }

        return await window.withProgress({
            location: ProgressLocation.Window,
            title: config.messages.mutationTestingRunning,
        }, async () => {
            try {
                throw new Error('Not implemented');
            } catch (error) {
                reporterUtils.errorNotification(config.errors.mutationTestingFailed);
                throw new Error(config.errors.mutationTestingFailed);
            }
        });
    }
}