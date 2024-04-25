import { ChildProcessWithoutNullStreams, spawn } from 'child_process';

import { ProgressLocation, window } from 'vscode';
import { JSONRPC, JSONRPCClient, JSONRPCRequest, JSONRPCResponse, TypedJSONRPCClient } from 'json-rpc-2.0';
import { WebSocket, Data } from 'ws';
import * as vscode from 'vscode';
import { Subject, filter, map } from 'rxjs';

import { MutantResult } from '../api/mutant-result.js';
import { Logger } from '../utils/logger.js';
import { config } from '../config.js';

import { InstrumentParams, MutateParams, MutatePartialResult, MutationServerMethods, ProgressParams } from './mutation-server-methods.js';

export class MutationServer {
  private readonly process: ChildProcessWithoutNullStreams;
  private rpcClient: TypedJSONRPCClient<MutationServerMethods> | undefined;
  private webSocket: WebSocket | undefined;

  private nextID = 1;
  private readonly createID = () => this.nextID++;

  private readonly notification$Subject = new Subject<JSONRPCRequest>();
  public progressNotification$ = this.notification$Subject.pipe(
    filter((request) => request.method === 'progress'),
    map((request) => request.params as ProgressParams<any>),
  );

  private constructor(private readonly logger: Logger) {
    // Start the mutation server
    const workspaceConfig = vscode.workspace.getConfiguration(config.app.name);

    const mutationServerExecutablePath: string | undefined = workspaceConfig.get('mutationServerExecutablePath');

    if (!mutationServerExecutablePath) {
      logger.logError(config.errors.mutationServerExecutablePathNotSet);
      throw new Error(config.errors.mutationServerExecutablePathNotSet);
    }

    const mutationServerPort = workspaceConfig.get('mutationServerPort') ?? 8080;
    const args = ['--port', mutationServerPort.toString()];

    this.process = spawn(mutationServerExecutablePath, args, { cwd: vscode.workspace.workspaceFolders![0].uri.fsPath });

    if (this.process.pid === undefined) {
      logger.logError(
        `[Mutation Server] Failed to start mutation server with executable path: ${mutationServerExecutablePath} ` +
          `and port: ${mutationServerPort}. These properties can be configured in the extension settings, then reload the window.`,
      );
      throw new Error(config.errors.mutationServerFailed);
    }

    this.process.on('exit', (code) => {
      logger.logInfo(`[Mutation Server] Exited with code ${code}`);
    });

    this.process.stdout.on('data', (data) => {
      logger.logInfo(`[Mutation Server] ${data.toString()}`);
    });

    this.process.stderr.on('data', (data) => {
      logger.logError(`[Mutation Server] ${data.toString()}`);
    });
  }

  public static async create(logger: Logger): Promise<MutationServer> {
    const server = new MutationServer(logger);
    await server.connect();
    return server;
  }

  private async connect(): Promise<void> {
    await this.waitForMutationServerStarted();
    this.connectViaWebSocket();

    this.rpcClient = new JSONRPCClient(async (jsonRpcRequest: JSONRPCRequest) => {
      await this.waitForOpenSocket(this.webSocket!);
      this.webSocket!.send(JSON.stringify(jsonRpcRequest));
    }, this.createID);
  }

  public async instrument(params: InstrumentParams): Promise<MutantResult[]> {
    return await window.withProgress(
      {
        location: ProgressLocation.Window,
        title: config.messages.instrumentationRunning,
      },
      async () => {
        if (!this.rpcClient) {
          throw new Error('Setup method not called.');
        }

        const result = await this.rpcClient.request('instrument', params);

        return result;
      },
    );
  }

  public async mutate(
    params: MutateParams,
    onPartialResult: (partialResult: MutatePartialResult) => void,
    token: vscode.CancellationToken,
  ): Promise<void> {
    return await window.withProgress(
      {
        location: ProgressLocation.Window,
        title: config.messages.mutationTestingRunning,
        cancellable: true,
      },
      async () => {
        if (!this.rpcClient) {
          throw new Error('Setup method not called.');
        }

        this.progressNotification$
          .pipe(
            filter((progress: ProgressParams<MutatePartialResult>) => progress.token === params.partialResultToken),
            map((progress) => progress.value),
          )
          .subscribe(onPartialResult);

        const requestId = this.createID();

        token.onCancellationRequested(() => {
          this.rpcClient!.notify('cancelRequest', { id: requestId });
        });

        await this.rpcClient.requestAdvanced({
          jsonrpc: JSONRPC,
          id: requestId,
          method: 'mutate',
          params: params,
        });
      },
    );
  }

  private connectViaWebSocket() {
    const workspaceConfig = vscode.workspace.getConfiguration(config.app.name);
    const mutationServerPort: number | undefined = workspaceConfig.get('mutationServerPort');

    if (!mutationServerPort) {
      this.logger.logError(config.errors.mutationServerPortNotSet);
      throw new Error(config.errors.mutationServerPortNotSet);
    }

    this.webSocket = new WebSocket(`ws://localhost:${mutationServerPort}`);

    this.webSocket.on('message', (data: Data) => {
      let response: JSONRPCRequest | JSONRPCResponse | undefined;

      try {
        response = JSON.parse(data.toString());
      } catch (error) {
        this.logger.logError(`Error parsing JSON: ${data.toString()}`);
        return;
      }

      if (response) {
        const isNotification = !response.id;

        if (isNotification) {
          this.notification$Subject.next(response as JSONRPCRequest);
        } else {
          this.rpcClient!.receive(response as JSONRPCResponse);
        }
      }
    });

    this.webSocket.on('error', async (err) => {
      this.logger.logError(`WebSocket Error: ${err}`);
      await this.logger.errorNotification(config.errors.mutationServerFailed);
    });
  }

  private readonly waitForOpenSocket = (socket: WebSocket): Promise<void> => {
    return new Promise<void>((resolve) => {
      if (socket.readyState !== socket.OPEN) {
        socket.on('open', () => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  };

  private readonly waitForMutationServerStarted = async (): Promise<void> => {
    await new Promise<void>((resolve) => {
      this.process.stdout.on('data', (data) => {
        if (data.toString().includes('Server started')) {
          resolve();
        }
      });
    });
  };
}
