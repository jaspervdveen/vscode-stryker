import * as vscode from 'vscode';

export function errorNotification(message: string): void {
    vscode.window.showErrorMessage(message);    
}

export function infoNotification(message: string): void {
    vscode.window.showInformationMessage(message);
}

export function warningNotification(message: string): void {
    vscode.window.showWarningMessage(message);
}