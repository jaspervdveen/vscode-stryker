export interface Config {
  app: {
    name: string;
    displayName: string;
    fileChangeDebounceTimeMs: number;
    defaultWindowsExecutablePath: string;
    defaultUnixExecutablePath: string;
  };
  messages: {
    instrumentationRunning: string;
    mutationTestingRunning: string;
    workspaceFolderSetupStarted: string;
  };
  errors: {
    instrumentationFailed: string;
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
    defaultWindowsExecutablePath: '.\\node_modules\\.bin\\stryker-server.cmd',
    defaultUnixExecutablePath: './node_modules/.bin/stryker-server',
  },
  messages: {
    instrumentationRunning: 'Running instrumentation',
    mutationTestingRunning: 'Running mutation testing',
    workspaceFolderSetupStarted: 'Setup workspace folder started',
  },
  errors: {
    instrumentationFailed: 'Error running instrumentation. Check the output for more information.',
    mutationServerStartTimeoutReached: 'Timeout reached while waiting for port information from mutation server process.',
    mutationServerProcessSpawnFailed: 'Spawning mutation server process failed.',
    workspaceFolderSetupFailed: 'Setting up workspace folder failed.',
  },
};
