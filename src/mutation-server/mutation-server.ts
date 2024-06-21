import { JSONRPC, JSONRPCClient, JSONRPCRequest, JSONRPCResponse, TypedJSONRPCClient } from 'json-rpc-2.0';
import { ProgressLocation, window } from 'vscode';
import { Subject, filter, map } from 'rxjs';
import * as vscode from 'vscode';

import { config } from '../config';
import { MutantResult } from '../api/mutant-result';
import { Logger } from '../utils/logger';

import {
  InitializeParams,
  InitializeResult,
  InstrumentParams,
  MutationTestParams,
  MutationTestPartialResult,
  MutationServerMethods,
  ProgressParams,
  ServerCapabilities,
} from './mutation-server-protocol';
import { Transporter } from './transport/transporter';

export class MutationServer {
  private readonly rpcClient: TypedJSONRPCClient<MutationServerMethods>;
  private readonly notificationSubject = new Subject<JSONRPCRequest>();
  private readonly progressNotification$ = this.notificationSubject.pipe(
    filter((request) => request.method === 'progress'),
    map((request) => request.params as ProgressParams<any>),
  );
  private nextID = 1;
  private readonly createID = () => this.nextID++;

  constructor(
    transporter: Transporter,
    private readonly logger: Logger,
    private serverCapabilities?: ServerCapabilities,
  ) {
    this.rpcClient = new JSONRPCClient(async (jsonRpcRequest: JSONRPCRequest) => {
      transporter.send(JSON.stringify(jsonRpcRequest));
    }, this.createID);

    transporter.on('message', (message: string) => this.handleMessage(message));
  }

  private handleMessage(message: string): void {
    let response: JSONRPCRequest | JSONRPCResponse | undefined;

    try {
      response = JSON.parse(message);
    } catch (error) {
      this.logger.logError(`Failed to parse JSON: ${error}`);
      throw error;
    }

    if (response) {
      const isNotification = !response.id;

      if (isNotification) {
        this.notificationSubject.next(response as JSONRPCRequest);
      } else {
        this.rpcClient.receive(response as JSONRPCResponse);
      }
    }
  }

  public async initialize(params: InitializeParams): Promise<void> {
    const initializeResult: InitializeResult = await this.rpcClient.request('initialize', params);

    this.serverCapabilities = initializeResult.capabilities;
  }

  public async instrument(params: InstrumentParams): Promise<MutantResult[]> {
    if (!this.serverCapabilities?.instrumentationProvider) {
      throw new Error('Instrumentation is not supported by the server');
    }

    return await window.withProgress(
      {
        location: ProgressLocation.Window,
        title: config.messages.instrumentationRunning,
      },
      async () => {
        const result = await this.rpcClient.request('instrument', params);

        return result;
      },
    );
  }

  public async mutationTest(
    params: MutationTestParams,
    onPartialResult: (partialResult: MutationTestPartialResult) => void,
    token?: vscode.CancellationToken,
  ): Promise<void> {
    if (!this.serverCapabilities?.mutationTestProvider) {
      throw new Error('Mutation testing is not supported by the server');
    }

    const requestId = this.createID();

    token?.onCancellationRequested(() => {
      this.rpcClient.notify('$/cancelRequest', { id: requestId });
    });

    const partialResultSupport = this.serverCapabilities.mutationTestProvider.partialResults;

    if (partialResultSupport) {
      params.partialResultToken = requestId;

      this.progressNotification$
        .pipe(
          filter((progress: ProgressParams<MutationTestPartialResult>) => progress.token === params.partialResultToken),
          map((progress) => progress.value),
        )
        .subscribe(onPartialResult);
    }

    return await window.withProgress(
      {
        location: ProgressLocation.Window,
        title: config.messages.mutationTestingRunning,
      },
      async () => {
        const response = await this.rpcClient.requestAdvanced({
          jsonrpc: JSONRPC,
          id: requestId,
          method: 'mutationTest',
          params: params,
        });

        onPartialResult({
          mutants: response.result,
        });
      },
    );
  }
}
