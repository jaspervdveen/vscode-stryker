import { ChildProcessWithoutNullStreams, spawn } from 'child_process';

import * as vscode from 'vscode';

import { config } from '../config.js';
import { Logger } from '../utils/logger.js';
import { WebSocketTransporter } from '../mutation-server/transport/web-socket-transporter.js';
import { MutationServerProtocolHandler } from '../mutation-server/mutation-server-protocol-handler.js';
import { Transporter } from '../mutation-server/transport/transporter.js';

import { TestRunHandler } from './test-run-handler.js';
import { FileChangeHandler } from './file-change-handler.js';
import { TestControllerHandler } from './test-controller-handler.js';

export async function setupWorkspaceFolder(workspaceFolder: vscode.WorkspaceFolder, logger: Logger): Promise<void> {
  const mutationServerProcess = spawnMutationServerProcess(workspaceFolder, logger);
  const port = await getMutationServerPort(mutationServerProcess, config.app.serverStartTimeoutMs);

  const transporter: Transporter = new WebSocketTransporter(port);

  transporter.on('connected', async () => {
    await setupWorkspaceFolderHandlers(transporter, workspaceFolder, logger);
  });
}

function spawnMutationServerProcess(workspaceFolder: vscode.WorkspaceFolder, logger: Logger): ChildProcessWithoutNullStreams {
  const workspaceFolderConfig = vscode.workspace.getConfiguration(config.app.name, workspaceFolder);
  const mutationServerExecutablePath: string | undefined = workspaceFolderConfig.get('mutationServerExecutablePath');

  if (!mutationServerExecutablePath) {
    throw new Error(config.errors.mutationServerExecutablePathNotSet);
  }

  const process = spawn(mutationServerExecutablePath, { cwd: workspaceFolder.uri.fsPath });

  if (process.pid === undefined) {
    throw new Error(config.errors.mutationServerProcessSpawnFailed);
  }

  process.stdout.on('data', (data: string) => logger.logInfo(data));
  process.stderr.on('error', (error) => logger.logError(error.toString()));
  process.on('exit', (code: number | null) => logger.logInfo(`Server process exited with code ${code}`));

  return process;
}

async function setupWorkspaceFolderHandlers(transporter: Transporter, workspaceFolder: vscode.WorkspaceFolder, logger: Logger): Promise<void> {
  const protocolHandler = new MutationServerProtocolHandler(transporter, logger);

  const testController = vscode.tests.createTestController(workspaceFolder.name, workspaceFolder.name);
  const testControllerHandler = new TestControllerHandler(testController, workspaceFolder);

  await FileChangeHandler.create(protocolHandler, testControllerHandler, logger, workspaceFolder);
  new TestRunHandler(testController, protocolHandler, testControllerHandler);

  try {
    const instrumentationResult = await protocolHandler.instrument({});
    testControllerHandler.updateTestExplorerFromInstrumentRun(instrumentationResult);
  } catch (error: any) {
    await vscode.window.showErrorMessage(config.errors.instrumentationFailed);
    const errorMessage: string = error.toString();
    logger.logError(errorMessage);
  }
}

async function getMutationServerPort(mutationServerProcess: ChildProcessWithoutNullStreams, timeout: number): Promise<number> {
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
