import EventEmitter from 'node:events';
import { ChildProcessWithoutNullStreams } from 'node:child_process';

import WebSocket from 'ws';

import { config } from '../../config';

import { Transporter } from './transporter';

export class WebSocketTransporter extends EventEmitter implements Transporter {
  private readonly webSocket: WebSocket;

  constructor(port: number) {
    super();
    this.webSocket = new WebSocket(`ws://localhost:${port}`);

    this.setupCallbacks();
  }

  public static async create(serverProcess: ChildProcessWithoutNullStreams): Promise<WebSocketTransporter> {
    const port = await this.getWebSocketPort(serverProcess, config.app.serverStartTimeoutMs);
    const transporter = new WebSocketTransporter(port);
    await this.waitForConnectionEstablished(transporter);

    return transporter;
  }

  private static async waitForConnectionEstablished(transporter: Transporter): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        reject(new Error(config.errors.mutationServerStartTimeoutReached));
      }, config.app.serverStartTimeoutMs);

      transporter.on('connected', () => resolve());
      transporter.on('error', (error) => reject(new Error(`Failed to establish connection: ${error}`)));
    });
  }

  private static async getWebSocketPort(mutationServerProcess: ChildProcessWithoutNullStreams, timeout: number): Promise<number> {
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

  private setupCallbacks() {
    this.webSocket.onclose = () => this.emit('close');
    this.webSocket.onmessage = (event) => this.emit('message', event.data.toString());
    this.webSocket.onopen = () => this.emit('connected');
    this.webSocket.onerror = (error: WebSocket.ErrorEvent) => {
      const { message } = error;
      this.emit('error', new Error(message));
    };
  }

  public send(message: string): void {
    this.webSocket.send(message);
  }
}
