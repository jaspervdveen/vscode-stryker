export interface Config {
    app: {
        name: string;
        currentWorkingDirectory: string;
        jsonReporterFilename: string;
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
    };
}