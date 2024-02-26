import * as vscode from 'vscode';
import { exec, ExecException } from 'child_process';

export function activate(context: vscode.ExtensionContext) {

	const runAllTestsCommandHandler = () => {
		if (!vscode.workspace.workspaceFolders) {
			vscode.window.showErrorMessage('No workspace is open');
			return;
		}

		// all of these paths work
		const command =  `${vscode.workspace.workspaceFolders[0].uri.fsPath}/node_modules/.bin/stryker run`;
		const command2 =  `npx stryker run`;
		const command3 =  `./node_modules/.bin/stryker run`;

		vscode.window.showInformationMessage('Running mutation tests...');

		exec(command2, { cwd: vscode.workspace.workspaceFolders[0].uri.fsPath}, (error: ExecException | null, stdout: string, stderr: string) => {
			if (error) {
			  console.log(`Error executing command: ${error.message}`);
			  return;
			}
			if (stderr) {
				console.log(`Command stderr: ${stderr}`);
			  return;
			}
			console.log(stdout);
		  });
	};

	context.subscriptions.push(vscode.commands.registerCommand("stryker-mutator.runOnWorkspace", runAllTestsCommandHandler));
}

export function deactivate() { }
