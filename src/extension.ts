import * as vscode from 'vscode';
import { exec, ExecException } from 'child_process';


export function activate(context: vscode.ExtensionContext) {

	const controller = vscode.tests.createTestController('stryker-mutator', 'Stryker Mutator');

	const readMutationReport = async (file: vscode.Uri) => {
		const contents = await vscode.workspace.fs.readFile(file);
		return JSON.parse(contents.toString());
	};

	const readTestsFromMutationReport = (mutationReport: any) => {
		const tests: vscode.TestItem[] = [];
		for (const fileName in mutationReport.files) {

			const file = mutationReport.files[fileName];

			const folderTestItem = controller.createTestItem(fileName, fileName, vscode.Uri.file(`${vscode.workspace.workspaceFolders![0].uri.fsPath}/${fileName}`));

			for (const mutant of file.mutants) {

				const fileUri = vscode.Uri.file(`${vscode.workspace.workspaceFolders![0].uri.fsPath}/${fileName}`);

				let testItem = controller.createTestItem(mutant.id, `${mutant.mutatorName} (${mutant.location.start.line}:${mutant.location.start.column})`, fileUri);
				testItem.range = new vscode.Range(
					new vscode.Position(mutant.location.start.line - 1, mutant.location.start.column - 1),
					new vscode.Position(mutant.location.end.line - 1, mutant.location.end.column - 1)
				);
				testItem.description = `${mutant.status}`;
				testItem.canResolveChildren = false;
				testItem.sortText = `${mutant.id}`;

				folderTestItem.children.add(testItem);
			}

			tests.push(folderTestItem);
		}
		return tests;
	};

	context.subscriptions.push(vscode.commands.registerCommand('stryker-mutator.loadJsonReport', async file => {
		const mutationReport = await readMutationReport(file);

		const tests = readTestsFromMutationReport(mutationReport);

		controller.items.replace(tests);

		const run = controller.createTestRun(
			new vscode.TestRunRequest(),
			'stryker-mutator',
			false
		);


		for (const fileName in mutationReport.files) {

			const file = mutationReport.files[fileName];

			for (const mutant of file.mutants) {

				const testItem = controller.items.get(fileName)?.children.get(mutant.id);

				if (!testItem) { continue; }

				if (mutant.status === 'Killed') {
					run.passed(testItem);
				} else {
					const message = new vscode.TestMessage(`${mutant.mutatorName} (${mutant.location.start.line}:${mutant.location.start.column}) ${mutant.status}`);

					await vscode.workspace.fs.readFile(vscode.Uri.file(`${vscode.workspace.workspaceFolders![0].uri.fsPath}/${fileName}`)).then((contents) => {

						const lines = contents.toString().split('\n');
						const startLine = mutant.location.start.line - 1;
						const endLine = mutant.location.end.line - 1;

						let code = lines.slice(startLine, endLine + 1).join('\n');
						const startColumn = mutant.location.start.column - 1;
						const endColumn = mutant.location.end.column - 1;

						code = code.substring(startColumn, endColumn);
						message.expectedOutput = code;
						message.actualOutput = mutant.replacement;

						run.failed(testItem, message);
					});

				}
			}
		}

		run.end();

		vscode.window.showInformationMessage('Mutation tests loaded');
	}));


	const runAllTestsCommandHandler = () => {
		// vscode.commands.executeCommand('stryker-mutator.loadJsonReport',
		// 	vscode.Uri.file(`${vscode.workspace.workspaceFolders![0].uri.fsPath}/reports/mutation/mutation.json`));


		if (!vscode.workspace.workspaceFolders) {
			vscode.window.showErrorMessage('No workspace is open');
			return;
		}

		// all of these paths work
		const command = `${vscode.workspace.workspaceFolders[0].uri.fsPath}/node_modules/.bin/stryker run`;
		const command2 = `npx stryker run`;
		const command3 = `./node_modules/.bin/stryker run`;

		vscode.window.showInformationMessage('Running mutation tests...');

		exec(command2, { cwd: vscode.workspace.workspaceFolders[0].uri.fsPath },
			(error: ExecException | null, stdout: string, stderr: string) => {
				if (error) {
					console.log(`Error executing command: ${error.message}`);
					return;
				}
				if (stderr) {
					console.log(`Command stderr: ${stderr}`);
					return;
				}
				console.log(stdout);

				vscode.commands.executeCommand('stryker-mutator.loadJsonReport',
					vscode.Uri.file(`${vscode.workspace.workspaceFolders![0].uri.fsPath}/reports/mutation/mutation.json`));
			});
	};



	context.subscriptions.push(vscode.commands.registerCommand("stryker-mutator.runOnWorkspace", runAllTestsCommandHandler));
}

export function deactivate() { }
