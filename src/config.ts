export interface Config {
    app: {
        name: string;
        displayName: string;
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
        mutationServerPortNotSet: string;
    };
}

export const config: Config = {
    app: {
        name: 'stryker-mutator',
        displayName: 'Stryker Mutator',
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
        mutationServerPortNotSet: 'Mutation server port is not set.',
    }
};

