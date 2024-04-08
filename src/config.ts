import * as vscode from 'vscode';

export interface Config {
    app: {
        name: string;
        currentWorkingDirectory: string;
        jsonReporterFilename: string;
        fileChangeDebounceTimeMs: number;
        mutationServerExecutable: string;
        mutationServerAddress: string;
    };
    messages: {
        instrumentationRunning: string;
        instrumentationStarted: string;
        instrumentationCompleted: string;
        mutationTestingRunning: string;
    };
    errors: {
        instrumentationFailed: string;
        reportReadingFailed: string;
        mutationTestingFailed: string;
    };
}

export const config: Config = {
    app: {
        name: 'Stryker Mutator',
        currentWorkingDirectory: vscode.workspace.workspaceFolders![0].uri.fsPath,
        jsonReporterFilename: '/reports/mutation/mutation.json',
        fileChangeDebounceTimeMs: 250,
        mutationServerExecutable: '/home/jasper/repos/stryker-js/packages/core/bin/stryker-server.js',
        mutationServerAddress: 'ws://localhost:8080'
    },
    messages: {
        instrumentationRunning: 'Running instrumentation',
        instrumentationStarted: 'Instrumentation started',
        instrumentationCompleted: 'Instrumentation completed',
        mutationTestingRunning: 'Running mutation testing',
    },
    errors: {
        instrumentationFailed: 'Error running instrumentation',
        reportReadingFailed: 'Error reading mutation report',
        mutationTestingFailed: 'Error running mutation testing'
    }
};

