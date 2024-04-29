import * as vscode from 'vscode';

import { Logger } from './utils/logger';
import { setupWorkspaceFolder } from './handlers/workspace-handler';
import { config } from './config';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  if (!vscode.workspace.workspaceFolders) {
    // No workspace folders opened, nothing to do
    return;
  }

  const logger = new Logger();

  // Setup workspace folders, each workspace folder could have its own configuration
  vscode.workspace.workspaceFolders.forEach(async (folder) => {
    try {
      await setupWorkspaceFolder(folder, logger);
    } catch {
      logger.logError(config.errors.workspaceFolderSetupFailed);
    }
  });
}

export function deactivate(): void {
  // Empty for now
}
