import { ProgressLocation, window } from "vscode";
import { Platform } from "./platform.js";
import { MutationTestResult } from "mutation-testing-report-schema";
import { config } from "../config.js";
import { spawnSync } from "child_process";
import { fileUtils } from "../utils/file-utils.js";
import { reporterUtils } from "../utils/reporter-utils.js";

export class StrykerJs extends Platform {

    constructor() {
        // temp path to the unpublished stryker executable while in development
        // TODO: Make this configurable/autodetect
        super('/home/jasper/repos/stryker-js/packages/core/bin/stryker.js');
    }

    async instrumentationRun(files?: string[]): Promise<MutationTestResult> {
        const args = [
            'run',
            '--checkers', '',
            '--buildCommand', '',
            '--plugins', '',
            '--testRunner', '',
            '--reporters', 'json',
            '--instrumentRunOnly'
        ];

        if (files) {
            args.push('--mutate', files.join(','));
        }

        return await window.withProgress({
            location: ProgressLocation.Window,
            title: config.messages.instrumentationRunning,
        }, async () => {
            try {
                const result = spawnSync(this.executable, args, { cwd: config.app.currentWorkingDirectory });
                return await fileUtils.readMutationReport(fileUtils.getMutationReportUri());
            } catch (error) {
                reporterUtils.errorNotification(config.errors.instrumentationFailed);
                throw new Error(config.errors.instrumentationFailed);
            }
        });
    }

    async mutationTestingRun(files?: string[]): Promise<MutationTestResult> {
        let args: string[] = [
            'run',
            '--fileLogLevel', 'trace',
            '--reporters', 'json'
        ];
        
        if (files) {
            args.push('--mutate', files.join(','));
        }

        return await window.withProgress({
            location: ProgressLocation.Window,
            title: config.messages.mutationTestingRunning,
        }, async () => {
            try {
                const result = spawnSync(this.executable, args, { cwd: config.app.currentWorkingDirectory });
                return await fileUtils.readMutationReport(fileUtils.getMutationReportUri());
            } catch (error) {
                reporterUtils.errorNotification(config.errors.mutationTestingFailed);
                throw new Error(config.errors.mutationTestingFailed);
            }
        });
    }
}