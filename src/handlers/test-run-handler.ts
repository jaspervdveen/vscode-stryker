import * as vscode from 'vscode';
import { config } from '../config';
import { MutationServer } from '../mutation-server/mutation-server';
import { TestControllerHandler } from './test-controller-handler';
import { pathUtils } from '../utils/path-utils';
import { MutantResult } from '../api/mutant-result';

export class TestRunHandler {

    constructor(
        private testController: vscode.TestController,
        private mutationServer: MutationServer,
        private testControllerHandler: TestControllerHandler
    ) {
        this.testController.createRunProfile('Mutation', vscode.TestRunProfileKind.Run, (request) => this.mutationRunHandler(request));
    }

    public async mutationRunHandler(request: vscode.TestRunRequest) {
        const run = this.testController.createTestRun(request, config.app.name, true);

        const queue: vscode.TestItem[] = request.include ? [...request.include] : [...this.testController.items].map(([_, testItem]) => testItem);

        const startTest = (test: vscode.TestItem) => {
            run.started(test);
            test.children?.forEach(startTest);
        };

        queue.forEach(startTest);

        const globPatterns = pathUtils.filterCoveredPatterns(this.getGlobPatterns(queue));

        try {
            const result = await this.mutationServer.mutate(globPatterns);
            await this.handleResult(result, run);
        } catch (error: any) {
            run.appendOutput(error.toString());
        } finally {
            run.end();
        }
    }

    private async handleResult(result: MutantResult[], run: vscode.TestRun) {
        for (const mutantResult of result) {

            const cwd = vscode.workspace.workspaceFolders![0].uri.fsPath; // TODO: Temp hack fixed when backlog item #6642 is resolved
            const relativeFilePath = mutantResult.fileName.replace(cwd + '/', '');

            const testItem = this.testControllerHandler.addMutantToTestExplorer(relativeFilePath, mutantResult);

            testItem.description = mutantResult.status;

            switch (mutantResult.status) {
                case 'Timeout':
                case 'RuntimeError':
                case 'CompileError':
                case 'Killed':
                    run.passed(testItem);
                    break;
                case 'Ignored':
                    run.skipped(testItem);
                    break;
                default:
                    run.failed(testItem, await this.createTestMessage(mutantResult));
                    break;
            }
        }

    };

    private getGlobPatterns(testItems: vscode.TestItem[]): string[] {
        const globPatterns: string[] = [];

        testItems.forEach(testItem => {
            const uri = testItem.uri;
            if (uri) {
                // Item is a file or mutant
                const globPattern = vscode.workspace.asRelativePath(uri);
                if (globPattern) {
                    globPatterns.push(globPattern);
                }
            } else {
                // Item is a folder, everything in the folder should be included
                // Reconstruct the glob pattern from the test item
                let globPattern = `${testItem.label}/**/*`;
                let parent = testItem.parent;
                while (parent) {
                    globPattern = `${parent.label}/${globPattern}`;
                    parent = parent.parent;
                }

                globPatterns.push(globPattern);
            }
        });

        return globPatterns;
    }

    private async createTestMessage(mutant: MutantResult): Promise<vscode.TestMessage> {
        // A test message is shown as annotation in the editor
        const message = new vscode.TestMessage(`${mutant.mutatorName} (${mutant.location.start.line}:${mutant.location.start.column}) ${mutant.status}`);

        // Create a diff between the original code and the mutated code
        const fileUri = vscode.Uri.file(mutant.fileName);
        const fileLines = (await vscode.workspace.fs.readFile(fileUri)).toString().split('\n');

        const codeLines = fileLines.slice(mutant.location.start.line - 1, mutant.location.end.line);
        message.expectedOutput = codeLines.join('\n');

        if (codeLines.length === 1) {
            const replacedPart = codeLines[0].substring(mutant.location.start.column - 1, mutant.location.end.column - 1);
            message.actualOutput = codeLines[0].replace(replacedPart, mutant.replacement);
        } else {
            const firstLine = codeLines[0].substring(0, mutant.location.start.column - 1);
            const lastLine = codeLines[codeLines.length - 1].substring(mutant.location.end.column - 1);
            message.actualOutput = firstLine + mutant.replacement + lastLine;
        }

        return message;
    }

}