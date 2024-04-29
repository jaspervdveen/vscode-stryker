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
    mutationServerFailed: string;
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
    instrumentationFailed: 'Error running instrumentation. Check the output for more information.',
    reportReadingFailed: 'Error reading mutation report. Check the output for more information.',
    mutationTestingFailed: 'Error running mutation testing. Check the output for more information.',
    mutationServerExecutablePathNotSet: 'Mutation server executable path not set.',
    mutationServerFailed: 'Mutation server failed. Check the output for more information.',
  },
};
