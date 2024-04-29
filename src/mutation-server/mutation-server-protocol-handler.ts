import { JSONRPCClient, JSONRPCRequest, JSONRPCResponse, TypedJSONRPCClient } from 'json-rpc-2.0';
import { ProgressLocation, window } from 'vscode';
import { Subject, filter, map } from 'rxjs';

import { config } from '../config';
import { MutantResult } from '../api/mutant-result.js';

import { Logger } from '../utils/logger';

import { InstrumentParams, MutateParams, MutatePartialResult, MutationServerMethods, ProgressParams } from './mutation-server-protocol';
import { Transporter } from './transport/transporter';

export class MutationServerProtocolHandler {
  private readonly rpcClient: TypedJSONRPCClient<MutationServerMethods>;
  private readonly notification$Subject = new Subject<JSONRPCRequest>();
  private readonly progressNotification$ = this.notification$Subject.pipe(
    filter((request) => request.method === 'progress'),
    map((request) => request.params as ProgressParams<any>),
  );

  constructor(
    transporter: Transporter,
    private readonly logger: Logger,
  ) {
    this.rpcClient = new JSONRPCClient(async (jsonRpcRequest: JSONRPCRequest) => {
      transporter.send(JSON.stringify(jsonRpcRequest));
    });

    transporter.on('message', (message: string) => this.handleMessage(message));
  }

  private handleMessage(message: string): void {
    let response: JSONRPCRequest | JSONRPCResponse | undefined;

    try {
      response = JSON.parse(message);
    } catch (error) {
      this.logger.logError(`Failed to parse JSON: ${error}`);
      return;
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

  public async mutate(params: MutateParams, onPartialResult: (partialResult: MutatePartialResult) => void): Promise<void> {
    return await window.withProgress(
      {
        location: ProgressLocation.Window,
        title: config.messages.mutationTestingRunning,
        cancellable: true,
      },
      async () => {
        this.progressNotification$
          .pipe(
            filter((progress: ProgressParams<MutatePartialResult>) => progress.token === params.partialResultToken),
            map((progress) => progress.value),
          )
          .subscribe(onPartialResult);

        await this.rpcClient.request('mutate', params);
      },
    );
  }
}
