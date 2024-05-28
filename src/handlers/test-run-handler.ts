import { statSync } from 'fs';

import * as vscode from 'vscode';
import { v4 as uuid } from 'uuid';

import { config } from '../config';
import { pathUtils } from '../utils/path-utils';
import { MutantResult } from '../api/mutant-result';
import { MutateParams } from '../mutation-server/mutation-server-protocol';
import { MutationServer } from '../mutation-server/mutation-server';
import { Logger } from '../utils/logger';

import { TestControllerHandler } from './test-controller-handler';

export class TestRunHandler {
  constructor(
    private readonly testController: vscode.TestController,
    private readonly protocolHandler: MutationServer,
    private readonly testControllerHandler: TestControllerHandler,
  ) {
    this.testController.createRunProfile('Test mutations', vscode.TestRunProfileKind.Run, this.mutationRunHandler.bind(this));
  }

  public async mutationRunHandler(request: vscode.TestRunRequest, token: vscode.CancellationToken): Promise<void> {
    const run = this.testController.createTestRun(request, config.app.name, true);

    const queue: vscode.TestItem[] = request.include ? [...request.include] : [...this.testController.items].map(([_, testItem]) => testItem);

    const startTest = (test: vscode.TestItem) => {
      const isMutant = test.range;
      if (isMutant) {
        run.started(test);
      }

      test.children?.forEach(startTest);
    };

    queue.forEach(startTest);

    const globPatterns = pathUtils.filterCoveredPatterns(this.getGlobPatterns(queue));

    token.onCancellationRequested(() => {
      run.appendOutput('Test run cancellation requested.');
      run.end();
    });

    try {
      const mutateParams: MutateParams = {
        globPatterns: globPatterns,
        partialResultToken: uuid(),
      };

      await this.protocolHandler.mutate(
        mutateParams,
        async (partialResult) => {
          await this.handleResult(partialResult.mutants, run);
        },
        token,
      );
    } catch (error) {
      run.appendOutput(Logger.getErrorMessage(error));
    } finally {
      run.end();
    }
  }

  private async handleResult(result: MutantResult[], run: vscode.TestRun) {
    for (const mutantResult of result) {
      const pathUri = vscode.Uri.file(mutantResult.fileName);
      const testItem = this.testControllerHandler.addMutantToTestExplorer(pathUri, mutantResult);

      const location: vscode.Location = new vscode.Location(testItem.uri!, testItem.range!);
      run.appendOutput(this.createOutputMessage(mutantResult), location, testItem);

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
  }

  private createOutputMessage(mutant: MutantResult): string {
    let outputMessage = '';

    const relativeFilePath = vscode.workspace.asRelativePath(mutant.fileName, false);

    const makeBold = (text: string) => `\x1b[1m${text}\x1b[0m`;
    const makeBlue = (text: string) => `\x1b[34m${text}\x1b[0m`;
    const makeYellow = (text: string) => `\x1b[33m${text}\x1b[0m`;

    outputMessage += `[${mutant.status}] ${mutant.mutatorName}\r\n`;
    outputMessage += `${makeBlue(relativeFilePath)}:${makeYellow(mutant.location.start.line.toString())}:${makeYellow(mutant.location.start.column.toString())}\r\n`;
    outputMessage += `${makeBold('Replacement:')} ${mutant.replacement}\r\n`;
    outputMessage += `${makeBold('Covered by tests:')}\r\n`;
    if (mutant.coveredBy && mutant.coveredBy.length > 0) {
      mutant.coveredBy.forEach((test) => {
        outputMessage += `\t${test}\r\n`;
      });
    }

    outputMessage += `${makeBold('Killed by tests:')}\r\n`;
    if (mutant.killedBy && mutant.killedBy.length > 0) {
      mutant.killedBy.forEach((test) => {
        outputMessage += `\t${test}\r\n`;
      });
    }

    if (mutant.duration) {
      outputMessage += `${makeBold('Test Duration:')}${mutant.duration} milliseconds\r\n`;
    }
    if (mutant.testsCompleted) {
      outputMessage += `${makeBold('Tests Completed:')}${mutant.testsCompleted}\r\n`;
    }

    outputMessage += '\r\n\r\n';

    return outputMessage;
  }

  private getGlobPatterns(testItems: vscode.TestItem[]): string[] {
    const globPatterns: string[] = [];

    testItems.forEach((testItem) => {
      const { uri } = testItem;

      if (!uri) {
        throw new Error('Test item should have a URI');
      }

      const isDirectory = statSync(uri.fsPath).isDirectory();

      if (isDirectory) {
        // Everything in the directory should be included
        // Reconstruct the glob pattern from the test item
        let globPattern = `${testItem.label}/**/*`;
        let { parent } = testItem;
        while (parent) {
          globPattern = `${parent.label}/${globPattern}`;
          ({ parent } = parent);
        }

        globPatterns.push(globPattern);
      } else {
        // Item is a file or mutant
        let globPattern = vscode.workspace.asRelativePath(uri, false);
        if (testItem.range) {
          // Item is a mutant, add the range to the glob pattern
          globPattern += `:${testItem.range.start.line + 1}:${testItem.range.start.character}-${testItem.range.end.line + 1}:${testItem.range.end.character + 1}`;
        }

        if (globPattern) {
          globPatterns.push(globPattern);
        }
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
