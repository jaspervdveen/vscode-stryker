import * as vscode from 'vscode';

export interface Config {
    app: {
        name: string;
        displayName: string;
        currentWorkingDirectory: string;
        fileChangeDebounceTimeMs: number;
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
        mutationServerExecutablePathNotSet: string;
    };
}

export const Config: Config = {
    app: {
        name: 'stryker-mutator',
        displayName: 'Stryker Mutator',
        currentWorkingDirectory: vscode.workspace.workspaceFolders![0].uri.fsPath,
        fileChangeDebounceTimeMs: 250,
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
        mutationTestingFailed: 'Error running mutation testing',
        mutationServerExecutablePathNotSet: 'Mutation server executable path not set.',
    }
};

