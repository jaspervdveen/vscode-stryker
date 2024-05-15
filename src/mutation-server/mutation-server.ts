import { JSONRPC, JSONRPCClient, JSONRPCRequest, JSONRPCResponse, TypedJSONRPCClient } from 'json-rpc-2.0';
import { ProgressLocation, window } from 'vscode';
import { Subject, filter, map } from 'rxjs';
import * as vscode from 'vscode';

import { config } from '../config';
import { MutantResult } from '../api/mutant-result';
import { Logger } from '../utils/logger';

import { InstrumentParams, MutateParams, MutatePartialResult, MutationServerMethods, ProgressParams } from './mutation-server-protocol';
import { Transporter } from './transport/transporter';

export class MutationServer {
  private readonly rpcClient: TypedJSONRPCClient<MutationServerMethods>;
  private readonly notification$Subject = new Subject<JSONRPCRequest>();
  private readonly progressNotification$ = this.notification$Subject.pipe(
    filter((request) => request.method === 'progress'),
    map((request) => request.params as ProgressParams<any>),
  );
  private nextID = 1;
  private readonly createID = () => this.nextID++;

  constructor(
    transporter: Transporter,
    private readonly logger: Logger,
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
        this.notification$Subject.next(response as JSONRPCRequest);
      } else {
        this.rpcClient.receive(response as JSONRPCResponse);
      }
    }
  }

  public async instrument(params: InstrumentParams): Promise<MutantResult[]> {
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

  public async mutate(
    params: MutateParams,
    onPartialResult: (partialResult: MutatePartialResult) => void,
    token?: vscode.CancellationToken,
  ): Promise<void> {
    return await window.withProgress(
      {
        location: ProgressLocation.Window,
        title: config.messages.mutationTestingRunning,
      },
      async () => {
        this.progressNotification$
          .pipe(
            filter((progress: ProgressParams<MutatePartialResult>) => progress.token === params.partialResultToken),
            map((progress) => progress.value),
          )
          .subscribe(onPartialResult);

        const requestId = this.createID();

        token?.onCancellationRequested(() => {
          this.rpcClient.notify('$/cancelRequest', { id: requestId });
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
}
