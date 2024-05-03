import * as vscode from 'vscode';

import { WorkspaceHandler } from './handlers/workspace-handler';
import { Logger } from './utils/logger';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const logger = new Logger();
  new WorkspaceHandler(logger);
}

export function deactivate(): void {
  // Empty for now
}
