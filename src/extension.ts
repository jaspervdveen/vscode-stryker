import * as vscode from 'vscode';
import { PlatformFactory } from './platforms/platform-factory.js';
import { TestControllerHandler } from './utils/test-controller-handler.js';

export async function activate(context: vscode.ExtensionContext) {

	vscode.window.showInformationMessage('Starting mutation testing instrumentation run');
	const controller = vscode.tests.createTestController('stryker-mutator', 'Stryker Mutator');
	const testControllerHandler = new TestControllerHandler(controller);

	const platform = new PlatformFactory().getPlatform();

	platform.instrumentationRun().then((result) => {
		testControllerHandler.updateTestExplorer(result);
		vscode.window.showInformationMessage('Instrumentation run completed');
	});
}

export function deactivate() {}
