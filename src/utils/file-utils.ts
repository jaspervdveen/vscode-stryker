import * as vscode from 'vscode';
import { config } from '../config.js';
import { MutationTestResult } from 'mutation-testing-report-schema';

export const fileUtils = {
    async readMutationReport(file: vscode.Uri): Promise<MutationTestResult> {
        try {
            const contents = await vscode.workspace.fs.readFile(file);
            return JSON.parse(contents.toString());
        } catch (error) {
            console.error(config.errors.reportReadingFailed, error);
            throw error;
        }
    },

    getMutationReportUri(): vscode.Uri {
        return vscode.Uri.file(config.app.currentWorkingDirectory + config.app.jsonReporterFilename);
    }
}
