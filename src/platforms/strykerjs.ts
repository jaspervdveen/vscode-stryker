import { executeCommand } from "../utils/executor.js";
import { Platform } from "./platform.js";
import { errorNotification } from "../utils/reporter.js";
import { FileUtil } from "../utils/file.js";
import { ProgressLocation, window } from "vscode";
import { MutationTestResult } from "mutation-testing-report-schema";
import { config } from "../config.js";

export class StrykerJs implements Platform {

    // temp path to the unpublished stryker executable while in development
    // TODO: Make this configurable/autodetect
    executable = '/home/jasper/repos/stryker-js/packages/core/bin/stryker.js';

    async instrumentationRun(): Promise<MutationTestResult> {
        return await window.withProgress({
            location: ProgressLocation.Window,
            title: config.messages.instrumentationRunning,
            cancellable: false
        }, async () => {
            try {
                const command = `${this.executable} run --instrumentRunOnly --checkers ""` + 
                ` --buildCommand "" --plugins "" --testRunner "" --logLevel off --reporters json`;
                await executeCommand(command);

                return await FileUtil.readMutationReport(FileUtil.getMutationReportUri());
            } catch (error) {
                errorNotification(config.errors.instrumentationFailed);
                throw new Error(config.errors.instrumentationFailed);
            }
        });
    }
}