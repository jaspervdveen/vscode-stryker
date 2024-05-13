import * as vscode from 'vscode';

import { config } from '../config';
import { Logger } from '../utils/logger';
import { MutationServer } from '../mutation-server/mutation-server';
import { MutationServerFactory } from '../mutation-server/mutation-server-factory';

import { TestRunHandler } from './test-run-handler';
import { FileChangeHandler } from './file-change-handler';
import { TestControllerHandler } from './test-controller-handler';

export class WorkspaceHandler {
  private readonly mutationServerFactory: MutationServerFactory;

  constructor(private readonly logger: Logger) {
    this.mutationServerFactory = new MutationServerFactory(logger);

    // Setup each root folder in the workspace
    vscode.workspace.workspaceFolders?.forEach(async (folder) => {
      try {
        await this.setupWorkspaceFolder(folder);
      } catch (error) {
        logger.logError(Logger.getErrorMessage(error), folder.name);
        logger.logError(config.errors.workspaceFolderSetupFailed, folder.name);
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
    try {
      const instrumentationResult = await mutationServer.instrument({});
      testControllerHandler.updateTestExplorerFromInstrumentRun(instrumentationResult);
    } catch (error) {
      await vscode.window.showErrorMessage(config.errors.instrumentationFailed);
      this.logger.logError(Logger.getErrorMessage(error));
    }
  }
}
