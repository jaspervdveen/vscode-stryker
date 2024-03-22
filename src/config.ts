import { Config } from "./api/config.js";
import * as vscode from 'vscode';

export const config: Config = {
    currentWorkingDirectory: vscode.workspace.workspaceFolders![0].uri.fsPath,
    jsonReporterFilename: '/reports/mutation/mutation.json',
};