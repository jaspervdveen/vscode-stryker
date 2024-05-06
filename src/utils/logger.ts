import * as vscode from 'vscode';

import { config } from '../config';

export class Logger {
  private readonly outputChannel: vscode.OutputChannel;

  constructor() {
    this.outputChannel = vscode.window.createOutputChannel(config.app.displayName);
  }

  public static getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
  }

  public logError(message: string, workspaceFolderName?: string): void {
    this.outputChannel.appendLine(`[ERROR] ${workspaceFolderName ? `[${workspaceFolderName}] ` : ''}${message}`);
  }

  public logInfo(message: string, workspaceFolderName?: string): void {
    this.outputChannel.appendLine(`[INFO] ${workspaceFolderName ? `[${workspaceFolderName}] ` : ''}${message}`);
  }

  public async errorNotification(message: string): Promise<void> {
    await vscode.window.showErrorMessage(message);
  }

  public async infoNotification(message: string): Promise<void> {
    await vscode.window.showInformationMessage(message);
  }

  public async warningNotification(message: string): Promise<void> {
    await vscode.window.showWarningMessage(message);
  }
}
