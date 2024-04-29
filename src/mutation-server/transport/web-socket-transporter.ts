import EventEmitter from 'node:events';

import WebSocket from 'ws';

import { Transporter } from './transporter';

export class WebSocketTransporter extends EventEmitter implements Transporter {
  private readonly webSocket: WebSocket;

  constructor(port: number) {
    super();
    this.webSocket = new WebSocket(`ws://localhost:${port}`);

    this.setupCallbacks();
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
