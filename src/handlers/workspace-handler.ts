import { ChildProcessWithoutNullStreams, spawn } from 'child_process';

import * as vscode from 'vscode';

import { config } from '../config.js';
import { Logger } from '../utils/logger.js';
import { WebSocketTransporter } from '../mutation-server/transport/web-socket-transporter.js';
import { MutationServer } from '../mutation-server/mutation-server.js';
import { Transporter } from '../mutation-server/transport/transporter.js';
import { MutantResult } from '../api/mutant-result.js';

import { TestRunHandler } from './test-run-handler.js';
import { FileChangeHandler } from './file-change-handler.js';
import { TestControllerHandler } from './test-controller-handler.js';

export class WorkspaceHandler {
  constructor(private readonly logger: Logger) {
    // Setup mutation server and handlers for each root folder in the workspace
    vscode.workspace.workspaceFolders?.forEach(async (folder) => {
      try {
        const mutationServer = await this.setupMutationServer(folder);
        await this.setupHandlers(mutationServer, folder);
      } catch {
        logger.logError(config.errors.workspaceFolderSetupFailed);
      }
    });
  }

  private async setupMutationServer(workspaceFolder: vscode.WorkspaceFolder): Promise<MutationServer> {
    // Spawn the mutation server process
    const mutationServerProcess = this.spawnMutationServerProcess(workspaceFolder);

    // Setup message communication with the mutation server via a WebSocket connection
    const port = await this.getMutationServerPort(mutationServerProcess, config.app.serverStartTimeoutMs);
    const transporter: Transporter = new WebSocketTransporter(port);
    await this.waitForConnectionEstablished(transporter);

    // Create a handler for communication with the mutation server via the protocol
    return new MutationServer(transporter, this.logger);
  }

  private async setupHandlers(mutationServer: MutationServer, workspaceFolder: vscode.WorkspaceFolder): Promise<void> {
    // Create a test controller and its corresponding handler
    const testController = vscode.tests.createTestController(workspaceFolder.name, workspaceFolder.name);
    const testControllerHandler = new TestControllerHandler(testController, workspaceFolder);

    // Create a file change handler to detect changes in the workspace, which will trigger instrumentations
    await FileChangeHandler.create(mutationServer, testControllerHandler, this.logger, workspaceFolder);

    // Create test run handler to enable running mutation tests via the test explorer
    new TestRunHandler(testController, mutationServer, testControllerHandler);

    // Run initial instrumentation to fill the test explorer with tests
    let instrumentationResult: MutantResult[] = [];

    try {
      instrumentationResult = await mutationServer.instrument({});
    } catch (error: any) {
      await vscode.window.showErrorMessage(config.errors.instrumentationFailed);
      const errorMessage: string = error.toString();
      this.logger.logError(errorMessage);
    }

    // Update the test explorer with the results of the instrumentation
    testControllerHandler.updateTestExplorerFromInstrumentRun(instrumentationResult);
  }

  private async waitForConnectionEstablished(transporter: Transporter): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        reject(new Error(config.errors.mutationServerStartTimeoutReached));
      }, config.app.serverStartTimeoutMs);

      transporter.on('connected', () => resolve());
      transporter.on('error', (error) => reject(new Error(`Failed to establish connection: ${error}`)));
    });
  }

  private spawnMutationServerProcess(workspaceFolder: vscode.WorkspaceFolder): ChildProcessWithoutNullStreams {
    const workspaceFolderConfig = vscode.workspace.getConfiguration(config.app.name, workspaceFolder);
    const mutationServerExecutablePath: string | undefined = workspaceFolderConfig.get('mutationServerExecutablePath');

    if (!mutationServerExecutablePath) {
      throw new Error(config.errors.mutationServerExecutablePathNotSet);
    }

    const process = spawn(mutationServerExecutablePath, { cwd: workspaceFolder.uri.fsPath });

    if (process.pid === undefined) {
      throw new Error(config.errors.mutationServerProcessSpawnFailed);
    }

    process.stdout.on('data', (data: string) => this.logger.logInfo(data));
    process.stderr.on('error', (error) => this.logger.logError(error.toString()));
    process.on('exit', (code: number | null) => this.logger.logInfo(`Server process exited with code ${code}`));

    return process;
  }

  private async getMutationServerPort(mutationServerProcess: ChildProcessWithoutNullStreams, timeout: number): Promise<number> {
    return await new Promise<number>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(config.errors.mutationServerStartTimeoutReached));
      }, timeout);

      mutationServerProcess.stdout.on('data', (data) => {
        const dataString: string = data.toString();
        const port = /Server is listening on port: (\d+)/.exec(dataString);
        if (port) {
          clearTimeout(timeoutId);
          resolve(parseInt(port[1], 10));
        }
      });
    });
  }
}
