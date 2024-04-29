import { EventEmitter } from 'node:events';

/**
 * Interface for a transporter (e.g. WebSocket, HTTP, IPC, etc.)
 */
export interface Transporter extends EventEmitter {
  /**
   * Send a message over the transporter
   * @param message The message to send
   */
  send(message: string): void;
}
