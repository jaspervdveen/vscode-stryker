import * as vscode from 'vscode';
import { PlatformFactory } from './platforms/platform-factory.js';
import { TestControllerHandler } from './utils/test-controller-handler.js';
import { config } from './config.js';

export async function activate(context: vscode.ExtensionContext) {

	vscode.window.showInformationMessage(config.messages.instrumentationStarted);
	const controller = vscode.tests.createTestController(config.app.name, config.app.name);
	const testControllerHandler = new TestControllerHandler(controller);

	const platform = PlatformFactory.getPlatform();

	platform.instrumentationRun().then((result) => {
		testControllerHandler.updateTestExplorer(result);
		vscode.window.showInformationMessage(config.messages.instrumentationCompleted);
	});
}

export function deactivate() {}
