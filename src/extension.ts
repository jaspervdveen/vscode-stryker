import * as vscode from 'vscode';
import { TestControllerHandler } from './handlers/test-controller-handler.js';
import { Config } from './config.js';
import { FileChangeHandler } from './handlers/file-change-handler.js';
import { MutationServer } from './mutation-server/mutation-server.js';
import { TestRunHandler } from './handlers/test-run-handler.js';

export async function activate(context: vscode.ExtensionContext) {
	if (!vscode.workspace.workspaceFolders) {
		// No workspace is opened, so no need to start Stryker.
		return;
	}

	const mutationServer = new MutationServer();
	await mutationServer.connect();

	const controller = vscode.tests.createTestController(Config.app.name, Config.app.displayName);
	const testControllerHandler = new TestControllerHandler(controller);
	
	new FileChangeHandler(mutationServer, testControllerHandler);
	new TestRunHandler(controller, mutationServer, testControllerHandler);
	
	const instrumentationResult = await mutationServer.instrument();
	testControllerHandler.replaceTestExplorerContent(instrumentationResult);

	vscode.commands.registerCommand('stryker-mutator.instrument', async () => {
		const result = await mutationServer.instrument();
		testControllerHandler.updateTestExplorerFromInstrumentRun(result);
	});
}

export function deactivate() { }
