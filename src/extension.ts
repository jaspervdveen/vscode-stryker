import * as vscode from 'vscode';

import { setupWorkspace } from './handlers/workspace-handler';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  await setupWorkspace();
}

export function deactivate(): void {
  // Empty for now
}
