import * as vscode from 'vscode';

export const reporterUtils = {
    errorNotification(message: string): void {
        vscode.window.showErrorMessage(message);    
    },

    infoNotification(message: string): void {
        vscode.window.showInformationMessage(message);
    },

    warningNotification(message: string): void {
        vscode.window.showWarningMessage(message);
    }
};
