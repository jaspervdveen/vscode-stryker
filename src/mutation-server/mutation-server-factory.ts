import { ChildProcessWithoutNullStreams, spawn } from 'child_process';

import * as vscode from 'vscode';

import { Logger } from '../utils/logger';
import { config } from '../config';

import { MutationServer } from './mutation-server';
import { WebSocketTransporter } from './transport/web-socket-transporter';

export class MutationServerFactory {
  constructor(private readonly logger: Logger) {}

  public async create(workspaceFolder: vscode.WorkspaceFolder): Promise<MutationServer> {
    // Spawn the mutation server process
    const mutationServerProcess = this.spawnMutationServerProcess(workspaceFolder);

    // Setup a transporter to communicate with the mutation server process
    const transporter = await WebSocketTransporter.create(mutationServerProcess);

    // Create a handler for communication with the mutation server via the protocol
    return new MutationServer(transporter, this.logger);
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
}
