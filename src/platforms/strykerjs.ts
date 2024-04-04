import { ProgressLocation, window } from "vscode";
import { Platform } from "./platform.js";
import { MutationTestResult } from "mutation-testing-report-schema";
import { config } from "../config.js";
import { ChildProcess, ChildProcessWithoutNullStreams, spawn, spawnSync } from "child_process";
import { fileUtils } from "../utils/file-utils.js";
import { reporterUtils } from "../utils/reporter-utils.js";
import { JSONRPCClient, JSONRPCRequest, JSONRPCResponse, TypedJSONRPCClient } from "json-rpc-2.0";

type Methods = {
    instrument(params: { globPatterns?: string[] }): string;
};

export class StrykerJs implements Platform {

    private rpcClient: TypedJSONRPCClient<Methods>;
    private server: ChildProcessWithoutNullStreams;

    constructor() {
        // temp path to the unpublished stryker executable while in development
        // TODO: Make this configurable/autodetect
        const executable = '/home/jasper/repos/stryker-js/packages/core/bin/stryker-server.js';

        this.server = spawn(executable, { cwd: config.app.currentWorkingDirectory });

        this.server.stdout.on('data', (data: Buffer | string) => {
            let response: JSONRPCResponse | undefined;

            try {
                response = JSON.parse(data.toString());
            } catch (error) {
                console.log('Error parsing JSON: ', error);
            }

            if (response) {
                this.rpcClient.receive(response);
            }
        });

        this.server.on('exit', (code) => {
            this.rpcClient.rejectAllPendingRequests("Server exited with code " + code);
        });

        this.rpcClient = new JSONRPCClient((jsonRpcRequest: JSONRPCRequest) => {
            this.server.stdin.write(JSON.stringify(jsonRpcRequest) + '\n');
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