import * as vscode from 'vscode';

import { config } from '../config.js';
import { Logger } from '../utils/logger.js';
import { MutationServer } from '../mutation-server/mutation-server.js';
import { MutantResult } from '../api/mutant-result.js';
import { MutationServerFactory } from '../mutation-server/mutation-server-factory.js';

import { TestRunHandler } from './test-run-handler.js';
import { FileChangeHandler } from './file-change-handler.js';
import { TestControllerHandler } from './test-controller-handler.js';

export class WorkspaceHandler {
  private readonly mutationServerFactory: MutationServerFactory;

  constructor(private readonly logger: Logger) {
    this.mutationServerFactory = new MutationServerFactory(logger);

    // Setup each root folder in the workspace
    vscode.workspace.workspaceFolders?.forEach(async (folder) => {
      try {
        await this.setupWorkspaceFolder(folder);
      } catch {
        logger.logError(config.errors.workspaceFolderSetupFailed);
      }
    });
  }

  private async setupWorkspaceFolder(workspaceFolder: vscode.WorkspaceFolder) {
    // Create a mutation server for the workspace folder
    const mutationServer = await this.mutationServerFactory.create(workspaceFolder);

    // Create a test controller and its corresponding handler
    const testController = vscode.tests.createTestController(workspaceFolder.name, workspaceFolder.name);
    const testControllerHandler = new TestControllerHandler(testController, workspaceFolder);

    // Create a file change handler to detect changes in the workspace, which will trigger instrumentations
    await FileChangeHandler.create(mutationServer, testControllerHandler, this.logger, workspaceFolder);

    // Create test run handler to enable running mutation tests via the test explorer
    new TestRunHandler(testController, mutationServer, testControllerHandler);

    // Run initial instrumentation to fill the test explorer with tests
    await this.runInitialInstrumentation(mutationServer, testControllerHandler);
  }

  private async runInitialInstrumentation(mutationServer: MutationServer, testControllerHandler: TestControllerHandler): Promise<void> {
    let instrumentationResult: MutantResult[] = [];

    try {
      instrumentationResult = await mutationServer.instrument({});
    } catch (error: any) {
      await vscode.window.showErrorMessage(config.errors.instrumentationFailed);
      const errorMessage: string = error.toString();
      this.logger.logError(errorMessage);
    }

    testControllerHandler.updateTestExplorerFromInstrumentRun(instrumentationResult);
  }
}
