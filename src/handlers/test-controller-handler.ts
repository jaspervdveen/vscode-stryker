import { FileResult, MutantResult, MutationTestResult } from "mutation-testing-report-schema";
import * as vscode from 'vscode';
import { testItemUtils } from "../utils/test-item-utils";

export class TestControllerHandler {
    private testController: vscode.TestController;

    constructor(testController: vscode.TestController) {
        this.testController = testController;
    }

    private getMutantId(mutant: MutantResult): string {
        return `${mutant.mutatorName}(${mutant.location.start.line}:${mutant.location.start.column}-${mutant.location.end.line}:${mutant.location.end.column}) (${mutant.replacement})`;
    }

    public replaceTestExplorerContent(mutationReport: MutationTestResult) {
        const testItemNodes = testItemUtils.createTestItemNodeTree(mutationReport.files);
        const testItems = testItemUtils.createTestItems(testItemNodes, this.testController);

        this.testController.items.replace(testItems);
    }

    private deletePathFromTestExplorer(path: string): void {
        const directories = path.split('/');

        let currentNode = this.testController.items;
        let parent: vscode.TestItem | undefined;

        const fileName = directories[directories.length - 1];
        const parentDirectory = directories[directories.length - 2];

        // Traverse the tree to find the parent directory
        for (const directory of directories) {
            let node = currentNode.get(directory);

            if (directory === parentDirectory) {
                parent = node;
                node!.children.delete(fileName);
                break;
            }

            currentNode = node!.children;
        }

        // Remove parent directories that have no children
        while (parent && parent.children.size === 0) {
            const parentParent: vscode.TestItem | undefined = parent.parent;
            parentParent?.children.delete(parent.id);
            parent = parentParent;
        }
    }


    public deleteFromTestExplorer(paths: string[]): void {
        for (const path of paths) { 
            this.deletePathFromTestExplorer(path);
        }
    }

    private addFileToTestExplorer(path: string, result: FileResult): void {
        const directories = path.split('/');

        let currentNode = this.testController.items;

        // Create folder/file test item structure if it doesn't exist
        directories.forEach(directory => {
            let childNode = currentNode.get(directory);

            if (!childNode) {
                childNode = this.testController.createTestItem(directory, directory);
                currentNode.add(childNode);
            }

            currentNode = childNode.children;
        });

        // Add mutants to the file test item's children
        result.mutants.forEach(mutant => {
            const testItem = testItemUtils.createTestItem(
                mutant,
                vscode.Uri.file(`${vscode.workspace.workspaceFolders![0].uri.fsPath}/${path}`),
                this.testController
            );
            currentNode.add(testItem);
        });
    }

    public addToTestExplorer(result: MutationTestResult): any {
        Object.keys(result.files).forEach(path => {
            this.addFileToTestExplorer(path, result.files[path]);
        });
    }

    public updateTestExplorerFromInstrumentRun(result: MutationTestResult) {
        Object.keys(result.files).forEach(path => {
            const mutants = result.files[path].mutants;

            const testItem = testItemUtils.findFileTestItemByPath(this.testController.items, path);

            if (!testItem) {
                this.addFileToTestExplorer(path, result.files[path]);
            }
            else {
                const currentMutantTestItems = testItem.children;

                // Remove mutants in Test Explorer that are not existent in the new instrument result
                for (const [id] of currentMutantTestItems) {
                    const mutant = mutants.find(mutant => this.getMutantId(mutant) === id);
                    if (!mutant) {
                        currentMutantTestItems.delete(id);
                    }
                }

                // Add new mutants that are not found in the Test Explorer
                mutants.forEach(mutant => {
                    const mutantId = this.getMutantId(mutant);
                    if (!currentMutantTestItems.get(mutantId)) {
                        const testItem = testItemUtils.createTestItem(
                            mutant,
                            vscode.Uri.file(`${vscode.workspace.workspaceFolders![0].uri.fsPath}/${path}`),
                            this.testController
                        );
                        currentMutantTestItems.add(testItem);
                    }
                });
            }
        });
    }
}