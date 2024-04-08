import * as vscode from 'vscode';
import { TestControllerHandler } from './handlers/test-controller-handler.js';
import { config } from './config.js';
import { FileChangeHandler } from './handlers/file-change-handler.js';
import { MutationServer } from './mutation-server/mutation-server.js';

export async function activate(context: vscode.ExtensionContext) {
	const controller = vscode.tests.createTestController(config.app.name, config.app.name);
	const testControllerHandler = new TestControllerHandler(controller);

	const mutationServer = new MutationServer();
	await mutationServer.connect();

	mutationServer.instrument().then((result) => {
		testControllerHandler.replaceTestExplorerContent(result);
	});

	new FileChangeHandler(mutationServer, testControllerHandler);
}

export function deactivate() {}
