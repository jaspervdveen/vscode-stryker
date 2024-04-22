import * as vscode from 'vscode';
import { config } from '../config';

export class Logger {

    private outputChannel: vscode.OutputChannel;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel(config.app.displayName);
    }

    public logError(message: string): void {
        this.outputChannel.appendLine(`[ERROR] ${message}`);
    }

    public logInfo(message: string): void {
        this.outputChannel.appendLine(`[INFO] ${message}`);
    }

    public errorNotification(message: string): void {
        vscode.window.showErrorMessage(message);
    }

    public infoNotification(message: string): void {
        vscode.window.showInformationMessage(message);
    }

    public warningNotification(message: string): void {
        vscode.window.showWarningMessage(message);
    }
}
