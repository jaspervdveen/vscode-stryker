import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "stryker-mutator" is now active!');

	let disposable = vscode.commands.registerCommand('stryker-mutator.helloWorld', () => {
	vscode.window.showInformationMessage('Hello World from Stryker Mutator!');
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}
