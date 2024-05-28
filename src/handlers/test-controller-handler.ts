import * as schema from 'mutation-testing-report-schema';
import * as vscode from 'vscode';

import { MutantResult } from '../api/mutant-result';

export class TestControllerHandler {
  constructor(
    private readonly testController: vscode.TestController,
    private readonly workspaceFolder: vscode.WorkspaceFolder,
  ) {}

  public invalidateTestResults(): void {
    this.testController.invalidateTestResults();
  }

  private deleteUriFromTestExplorer(uri: vscode.Uri): void {
    const relativePath = vscode.workspace.asRelativePath(uri, false);
    const directories = relativePath.split('/');

    let currentNodes = this.testController.items;
    let parent: vscode.TestItem | undefined;

    const fileName = directories[directories.length - 1];
    const parentDirectory = directories[directories.length - 2];

    // Traverse the tree to find the parent directory
    for (const directory of directories) {
      const node = currentNodes.get(directory);

      if (directory === parentDirectory) {
        parent = node;
        node!.children.delete(fileName);
        break;
      }

      currentNodes = node!.children;
    }

    // Remove parent directories that have no children
    while (parent && parent.children.size === 0) {
      const parentParent: vscode.TestItem | undefined = parent.parent;
      if (!parentParent) {
        // Parent is top-level item
        this.testController.items.delete(parent.id);
        break;
      }
      parentParent.children.delete(parent.id);
      parent = parentParent;
    }
  }

  public addMutantToTestExplorer(fileUri: vscode.Uri, mutant: schema.MutantResult): vscode.TestItem {
    const relativePath = vscode.workspace.asRelativePath(fileUri, false);
    const directories = relativePath.split('/');

    let currentNode = this.testController.items;

    let currentUri = '';

    directories.forEach((directory) => {
      currentUri += `/${directory}`;

      let childNode = currentNode.get(directory);

      // If the child node doesn't exist, create a new test item for the directory
      if (!childNode) {
        const uri = vscode.Uri.file(`${this.workspaceFolder.uri.path}${currentUri}`);
        childNode = this.testController.createTestItem(directory, directory, uri);

        currentNode.add(childNode);
      }

      currentNode = childNode.children;
    });

    // Create and add a test item for the mutant with the given filePath
    const testItem = this.createTestItem(mutant, fileUri);

    currentNode.add(testItem);

    return testItem;
  }

  public deleteFromTestExplorer(fileUris: vscode.Uri[]): void {
    for (const path of fileUris) {
      this.deleteUriFromTestExplorer(path);
    }
  }

  public updateTestExplorerFromInstrumentRun(result: MutantResult[]): void {
    const groupedByFile = this.groupBy(result, 'fileName');

    for (const [fileName, mutants] of Object.entries(groupedByFile)) {
      const fileUri = vscode.Uri.file(fileName);

      const testItem = this.findFileTestItem(fileUri);

      // Remove mutants that are not present in the new instrument run result
      testItem?.children.replace([]);

      mutants.forEach((mutant) => {
        this.addMutantToTestExplorer(fileUri, mutant);
      });
    }
  }

  private findFileTestItem(fileUri: vscode.Uri): vscode.TestItem | undefined {
    const relativeFilePath = vscode.workspace.asRelativePath(fileUri, false);
    const directories = relativeFilePath.split('/');
    const fileName = directories[directories.length - 1];

    let currentCollection = this.testController.items;

    // Iterate through the directories to find the file test item in the tree
    for (const directory of directories) {
      const node = currentCollection.get(directory);

      if (node && node.id === fileName) {
        return node;
      }

      if (!node) {
        return undefined;
      }

      currentCollection = node.children;
    }
  }

  private createTestItem(mutant: schema.MutantResult, fileUri: vscode.Uri): vscode.TestItem {
    const mutantId = `${mutant.mutatorName}(${mutant.location.start.line}:${mutant.location.start.column}-${mutant.location.end.line}:${mutant.location.end.column}) (${mutant.replacement})`;
    const testItem = this.testController.createTestItem(
      mutantId,
      `${mutant.mutatorName} (${mutant.location.start.line}:${mutant.location.start.column})`,
      fileUri,
    );

    testItem.range = new vscode.Range(
      new vscode.Position(mutant.location.start.line - 1, mutant.location.start.column - 1),
      new vscode.Position(mutant.location.end.line - 1, mutant.location.end.column - 1),
    );

    return testItem;
  }

  private groupBy<T>(array: T[], property: keyof T): Record<string, T[]> {
    return array.reduce((accumulator: Record<string, T[]>, object: T) => {
      // Extract the value of the specified property from the current object
      const key = String(object[property]);

      // If the key doesn't exist in the accumulator object, create it and initialize it as an empty array
      if (!accumulator[key]) {
        accumulator[key] = [];
      }

      // Push the current object into the array corresponding to its key
      accumulator[key].push(object);
      return accumulator;
    }, {});
  }
}
