export interface Config {
  app: {
    name: string;
    displayName: string;
    fileChangeDebounceTimeMs: number;
    serverStartTimeoutMs: number;
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
    mutationServerFailed: string;
    mutationServerStartTimeoutReached: string;
    mutationServerProcessSpawnFailed: string;
    workspaceFolderSetupFailed: string;
  };
}

export const config: Config = {
  app: {
    name: 'stryker-mutator',
    displayName: 'Stryker Mutator',
    fileChangeDebounceTimeMs: 250,
    serverStartTimeoutMs: 5000,
  },
  messages: {
    instrumentationRunning: 'Running instrumentation',
    instrumentationStarted: 'Instrumentation started',
    instrumentationCompleted: 'Instrumentation completed',
    mutationTestingRunning: 'Running mutation testing',
  },
  errors: {
    instrumentationFailed: 'Error running instrumentation. Check the output for more information.',
    reportReadingFailed: 'Error reading mutation report. Check the output for more information.',
    mutationTestingFailed: 'Error running mutation testing. Check the output for more information.',
    mutationServerExecutablePathNotSet: 'Mutation server executable path not set.',
    mutationServerFailed: 'Mutation server failed. Check the output for more information.',
    mutationServerStartTimeoutReached: 'Timeout reached while waiting for port information from mutation server process.',
    mutationServerProcessSpawnFailed: 'Failed to spawn mutation server process.',
    workspaceFolderSetupFailed: 'Failed to setup workspace folder.',
  },
};
