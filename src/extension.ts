import * as vscode from 'vscode';
import { TestControllerHandler } from './handlers/test-controller-handler.js';
import { config } from './config.js';
import { FileChangeHandler } from './handlers/file-change-handler.js';
import { MutationServer } from './mutation-server/mutation-server.js';
import { Logger } from './utils/logger.js';
import { TestRunHandler } from './handlers/test-run-handler.js';

export async function activate(context: vscode.ExtensionContext) {
	if (!vscode.workspace.workspaceFolders) {
		// No workspace is opened, so no need to start Stryker.
		return;
	}

	const logger = new Logger();

	const mutationServer = new MutationServer(logger);
	await mutationServer.connect();

	const controller = vscode.tests.createTestController(config.app.name, config.app.displayName);
	const testControllerHandler = new TestControllerHandler(controller);
	
	new FileChangeHandler(mutationServer, testControllerHandler, logger);
	new TestRunHandler(controller, mutationServer, testControllerHandler);
	
	try {
		const instrumentationResult = await mutationServer.instrument();
		testControllerHandler.replaceTestExplorerContent(instrumentationResult);
	} catch (error: any) {
		vscode.window.showErrorMessage(config.errors.instrumentationFailed);
		logger.logError(error.toString());
	};

	vscode.commands.registerCommand('stryker-mutator.instrument', async () => {
		try {
			const result = await mutationServer.instrument();
			testControllerHandler.updateTestExplorerFromInstrumentRun(result);
		} catch (error: any) {
			vscode.window.showErrorMessage(config.errors.instrumentationFailed);
			logger.logError(error.toString());
		}
	});
}

export function deactivate() { }
