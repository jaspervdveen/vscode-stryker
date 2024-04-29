import * as vscode from 'vscode';

import { config } from '../config';

export class Logger {
  private readonly outputChannel: vscode.OutputChannel;

  constructor() {
    this.outputChannel = vscode.window.createOutputChannel(config.app.displayName);
  }

  public logError(message: string): void {
    this.outputChannel.appendLine(`[ERROR] ${message}`);
  }

  public logInfo(message: string): void {
    this.outputChannel.appendLine(`[INFO] ${message}`);
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
