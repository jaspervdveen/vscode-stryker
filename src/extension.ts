import * as vscode from 'vscode';
import { PlatformFactory } from './platforms/platform-factory.js';
import { TestControllerHandler } from './handlers/test-controller-handler.js';
import { config } from './config.js';
import { FileChangeHandler } from './handlers/file-change-handler.js';

export async function activate(context: vscode.ExtensionContext) {

	vscode.window.showInformationMessage(config.messages.instrumentationStarted);
	const controller = vscode.tests.createTestController(config.app.name, config.app.name);
	const testControllerHandler = new TestControllerHandler(controller);

	const platform = PlatformFactory.getPlatform();
	await platform.setup();

	platform.instrumentationRun().then((result) => {
		testControllerHandler.replaceTestExplorerContent(result);
		vscode.window.showInformationMessage(config.messages.instrumentationCompleted);
	});

	new FileChangeHandler(platform, testControllerHandler);
}

export function deactivate() {}
