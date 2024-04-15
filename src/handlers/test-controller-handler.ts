import * as schema from "mutation-testing-report-schema";
import * as vscode from 'vscode';
import { MutantResult } from "../api/mutant-result";

export class TestControllerHandler {
    private testController: vscode.TestController;

    constructor(testController: vscode.TestController) {
        this.testController = testController;
    }

    public invalidateTestResults() {
        this.testController.invalidateTestResults();
    }

    private getMutantId(mutant: schema.MutantResult): string {
        return `${mutant.mutatorName}(${mutant.location.start.line}:${mutant.location.start.column}-${mutant.location.end.line}:${mutant.location.end.column}) (${mutant.replacement})`;
    }

    private deletePathFromTestExplorer(path: string): void {
        const directories = path.split('/');

        let currentNodes = this.testController.items;
        let parent: vscode.TestItem | undefined;

        const fileName = directories[directories.length - 1];
        const parentDirectory = directories[directories.length - 2];

        // Traverse the tree to find the parent directory
        for (const directory of directories) {
            let node = currentNodes.get(directory);

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
            parentParent?.children.delete(parent.id);
            parent = parentParent;
        }
    }

    public addMutantToTestExplorer(filePath: string, mutant: schema.MutantResult): vscode.TestItem {
        const directories = filePath.split('/');

        let currentNode = this.testController.items;

        let currentUri: string = "";

        directories.forEach(directory => {
            currentUri += `/${directory}`;

            let childNode = currentNode.get(directory);

            // If the child node doesn't exist, create a new test item for the directory
            if (!childNode) {
                const uri = vscode.Uri.file(`${vscode.workspace.workspaceFolders![0].uri.fsPath}${currentUri}`);
                childNode = this.testController.createTestItem(directory, directory, uri);

                currentNode.add(childNode);
            }

            currentNode = childNode.children;
        });

        // Create and add a test item for the mutant with the given filePath
        const testItem = this.createTestItem(
            mutant,
            vscode.Uri.file(`${vscode.workspace.workspaceFolders![0].uri.fsPath}/${filePath}`)
        );

        currentNode.add(testItem);

        return testItem;
    }

    public deleteFromTestExplorer(paths: string[]): void {
        for (const path of paths) {
            this.deletePathFromTestExplorer(path);
        }
    }

    public updateTestExplorerFromInstrumentRun(result: MutantResult[]) {
        const groupedByFile = this.groupBy(result, 'fileName');

        for (const [filePath, mutants] of Object.entries(groupedByFile)) {
            const cwd = vscode.workspace.workspaceFolders![0].uri.fsPath; // TODO: Temp hack fixed when backlog item #6642 is resolved
            const relativeFilePath = filePath.replace(cwd + '/', '');

            const testItem = this.findFileTestItemByPath(relativeFilePath);

            if (testItem) {
                // Remove mutants in Test Explorer that are not existent in the new instrument result
                for (const [id] of testItem.children) {
                    const mutantResult = mutants.find(mutantResult => this.getMutantId(mutantResult) === id);
                    if (!mutantResult) {
                        testItem.children.delete(id);
                    }
                }
            }

            mutants.forEach(mutant => { this.addMutantToTestExplorer(relativeFilePath, mutant); });
        }
    }

    private findFileTestItemByPath(path: string): vscode.TestItem | undefined {
        const directories = path.split('/');
        const fileName = directories[directories.length - 1];

        let currentCollection = this.testController.items;

        // Iterate through the directories to find the file test item in the tree
        for (const directory of directories) {
            let node = currentCollection.get(directory);

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
        const testItem = this.testController.createTestItem(mutantId, `${mutant.mutatorName} (${mutant.location.start.line}:${mutant.location.start.column})`, fileUri);

        testItem.range = new vscode.Range(
            new vscode.Position(mutant.location.start.line - 1, mutant.location.start.column - 1),
            new vscode.Position(mutant.location.end.line - 1, mutant.location.end.column - 1)
        );

        return testItem;
    }

    private groupBy<T>(array: T[], property: keyof T): { [key: string]: T[] } {
        return array.reduce((accumulator: { [key: string]: T[] }, object: T) => {
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