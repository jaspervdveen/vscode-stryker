import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import * as os from 'os';

import * as vscode from 'vscode';

import { Logger } from '../utils/logger';
import { config } from '../config';

import { MutationServer } from './mutation-server';
import { WebSocketTransporter } from './transport/web-socket-transporter';
import { InitializeParams } from './mutation-server-protocol';

export class MutationServerFactory {
  constructor(private readonly logger: Logger) {}

  public async create(workspaceFolder: vscode.WorkspaceFolder): Promise<MutationServer> {
    // Spawn the mutation server process
    const mutationServerProcess = this.spawnMutationServerProcess(workspaceFolder);

    // Setup a transporter to communicate with the mutation server process
    const transporter = await WebSocketTransporter.create(mutationServerProcess);

    // Create a handler for communication with the mutation server via the protocol
    const server = new MutationServer(transporter, this.logger);

    // Initialize the mutation server
    const workspaceFolderConfig = vscode.workspace.getConfiguration(config.app.name, workspaceFolder);
    const configUri: string | undefined = workspaceFolderConfig.get('configFilePathOverwrite');

    const initializeParams: InitializeParams = {
      clientInfo: {
        version: config.app.protocolVersion,
      },
      ...(configUri && configUri.length > 0 ? { configUri } : {}),
    };

    await server.initialize(initializeParams);

    return server;
  }

  private spawnMutationServerProcess(workspaceFolder: vscode.WorkspaceFolder): ChildProcessWithoutNullStreams {
    const workspaceFolderConfig = vscode.workspace.getConfiguration(config.app.name, workspaceFolder);
    const serverPathOverwrite: string | undefined = workspaceFolderConfig.get('mutationServerExecutablePathOverwrite');

    let command = os.type() === 'Windows_NT' ? config.app.defaultWindowsExecutablePath : config.app.defaultUnixExecutablePath;

    if (serverPathOverwrite && serverPathOverwrite.length > 0) {
      command = serverPathOverwrite;
    }

    const process = spawn(command, { cwd: workspaceFolder.uri.fsPath });

    process.stdout.on('data', (data: string) => this.logger.logInfo(`[Mutation Server Process] ${data}`, workspaceFolder.name));
    process.stderr.on('data', (error: string) => this.logger.logError(`[Mutation Server Process] ${error.toString()}`, workspaceFolder.name));
    process.on('exit', (code: number | null) => this.logger.logInfo(`[Mutation Server Process] Exited with code ${code}`, workspaceFolder.name));

    if (process.pid === undefined) {
      throw new Error(config.errors.mutationServerProcessSpawnFailed);
    }

    return process;
  }
}
