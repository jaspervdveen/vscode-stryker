import * as vscode from 'vscode';
import { config } from '../config.js';
import { MutationTestResult } from '../api/schema.js';

export class FileUtil {
    static async readMutationReport(file: vscode.Uri): Promise<MutationTestResult> {
        try {
            const contents = await vscode.workspace.fs.readFile(file);
            return JSON.parse(contents.toString());
        } catch (error) {
            console.error('Error reading mutation report:', error);
            throw error;
        }
    }

    static getMutationReportUri(): vscode.Uri {
        return vscode.Uri.file(config.currentWorkingDirectory + config.jsonReporterFilename);
    }
}
