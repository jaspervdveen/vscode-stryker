import { ProgressLocation, window } from "vscode";
import { Platform } from "./platform.js";
import { MutationTestResult } from "mutation-testing-report-schema";
import { config } from "../config.js";
import { ChildProcess, ChildProcessWithoutNullStreams, spawn, spawnSync } from "child_process";
import { fileUtils } from "../utils/file-utils.js";
import { reporterUtils } from "../utils/reporter-utils.js";

export class StrykerJs implements Platform {

    private server: ChildProcessWithoutNullStreams;

    constructor() {
        // temp path to the unpublished stryker executable while in development
        // TODO: Make this configurable/autodetect
        const executable = '/home/jasper/repos/stryker-js/packages/core/bin/stryker-server.js';
        this.server = spawn(executable, { cwd: config.app.currentWorkingDirectory });

        this.server.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
        });
    }

    async instrumentationRun(globPatterns?: string[]): Promise<MutationTestResult> {
        return await window.withProgress({
            location: ProgressLocation.Window,
            title: config.messages.instrumentationRunning,
        }, async () => {
            try {
                this.server.stdin.write('run instrumentation\n');

                // spawnSync(this.executable, { cwd: config.app.currentWorkingDirectory });
                return await fileUtils.readMutationReport(fileUtils.getMutationReportUri());
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
                // spawnSync(this.executable, args, { cwd: config.app.currentWorkingDirectory });
                return await fileUtils.readMutationReport(fileUtils.getMutationReportUri());
            } catch (error) {
                reporterUtils.errorNotification(config.errors.mutationTestingFailed);
                throw new Error(config.errors.mutationTestingFailed);
            }
        });
    }
}