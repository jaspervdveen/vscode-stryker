import * as vscode from 'vscode';

export interface Config {
    app: {
        name: string;
        currentWorkingDirectory: string;
        fileChangeDebounceTimeMs: number;
        mutationServerExecutablePath: string;
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

export const Config: Config = {
    app: {
        name: 'Stryker Mutator',
        currentWorkingDirectory: vscode.workspace.workspaceFolders![0].uri.fsPath,
        fileChangeDebounceTimeMs: 250,
        mutationServerExecutablePath: '/home/jasper/repos/stryker-js/packages/core/bin/stryker-server.js',
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

