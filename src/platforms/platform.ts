import { errorNotification } from "../utils/reporter.js";
import { FileUtil } from "../utils/file.js";
import { ProgressLocation, window } from "vscode";
import { MutationTestResult } from "mutation-testing-report-schema";
import { config } from "../config.js";
import { spawnSync } from "child_process";

export abstract class Platform {
    executable: string;

    constructor(executable: string) {
        this.executable = executable;
    }

    public async instrumentationRun(args?: string[]): Promise<MutationTestResult> {
        return await window.withProgress({
            location: ProgressLocation.Window,
            title: config.messages.instrumentationRunning,
        }, async () => {
            try {
                spawnSync(this.executable, args, { cwd: config.app.currentWorkingDirectory });
                return await FileUtil.readMutationReport(FileUtil.getMutationReportUri());
            } catch (error) {
                errorNotification(config.errors.instrumentationFailed);
                throw new Error(config.errors.instrumentationFailed);
            }
        });
    }
}

