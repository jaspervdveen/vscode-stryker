import { Config } from "./api/config.js";
import * as vscode from 'vscode';

export const config: Config = {
    app: {
        name: 'Stryker Mutator',
        currentWorkingDirectory: vscode.workspace.workspaceFolders![0].uri.fsPath,
        jsonReporterFilename: '/reports/mutation/mutation.json',
    },
    messages: {
        instrumentationRunning: 'Running instrumentation',
        instrumentationStarted: 'Instrumentation started',
        instrumentationCompleted: 'Instrumentation completed'
    },
    errors: {
        instrumentationFailed: 'Error running instrumentation',
        reportReadingFailed: 'Error reading mutation report',
    }
};