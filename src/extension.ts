import * as vscode from 'vscode';
import { TestControllerHandler } from './handlers/test-controller-handler.js';
import { config } from './config.js';
import { FileChangeHandler } from './handlers/file-change-handler.js';
import { MutationServer } from './mutation-server/mutation-server.js';

export async function activate(context: vscode.ExtensionContext) {
	const mutationServer = new MutationServer();
	await mutationServer.connect();

	const controller = vscode.tests.createTestController(config.app.name, config.app.name);
	const testControllerHandler = new TestControllerHandler(controller);
	
	new FileChangeHandler(mutationServer, testControllerHandler);
	
	const instrumentationResult = await mutationServer.instrument();
	testControllerHandler.replaceTestExplorerContent(instrumentationResult);

	vscode.commands.registerCommand('stryker-mutator.instrument', async () => {
		const result = await mutationServer.instrument();
		testControllerHandler.updateTestExplorerFromInstrumentRun(result);
	});
}

export function deactivate() { }
