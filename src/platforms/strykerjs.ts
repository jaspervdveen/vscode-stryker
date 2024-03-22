import { executeCommand } from "../utils/executor.js";
import { Platform } from "./platform.js";
import { errorNotification } from "../utils/reporter.js";
import { FileUtil } from "../utils/file.js";
import { MutationTestResult } from "../api/schema.js";

export class StrykerJs implements Platform {

    executable = '/home/jasper/repos/stryker-js/packages/core/bin/stryker.js';

    async instrumentationRun(): Promise<MutationTestResult> {
        try {
            const command = `${this.executable} run --instrumentRunOnly`;
            await executeCommand(command);

            return await FileUtil.readMutationReport(FileUtil.getMutationReportUri());
        } catch (error) {
            console.log('Error running mutation testing:', error);
            errorNotification('Error running mutation testing');
            throw new Error('Error running mutation testing');
        }
    }
}