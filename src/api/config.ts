export interface Config {
    app: {
        name: string;
        currentWorkingDirectory: string;
        jsonReporterFilename: string;
    };
    messages: {
        instrumentationRunning: string;
        instrumentationStarted: string;
        instrumentationCompleted: string;
    };
    errors: {
        instrumentationFailed: string;
        reportReadingFailed: string;
    };
}