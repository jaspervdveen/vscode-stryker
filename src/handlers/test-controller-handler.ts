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

    private deletePathFromTestExplorer(path: string) {
        const directories = path.split('/');

        let currentNode = this.testController.items;
        let parent: vscode.TestItem | undefined;

        const fileName = directories[directories.length - 1];
        const parentDirectory = directories[directories.length - 2];

        for (const directory of directories) {
            let node = currentNode.get(directory);

            if (directory === parentDirectory) {
                parent = node;
                node!.children.delete(fileName);
                break;
            }

            currentNode = node!.children;
        }

        // remove parent directories that have no children
        while (parent && parent.children.size === 0) {
            const parentParent: vscode.TestItem | undefined = parent.parent;
            parentParent?.children.delete(parent.id);
            parent = parentParent;
        }
    }


    public deleteFromTestExplorer(paths: string[]) {
        for (const path of paths) { 
            this.deletePathFromTestExplorer(path);
        }
    }

    private addFileToTestExplorer(path: string, result: FileResult): void {
        const directories = path.split('/');

        let currentNode = this.testController.items;

        directories.forEach(directory => {
            let childNode = currentNode.get(directory);

            if (!childNode) {
                childNode = this.testController.createTestItem(directory, directory);
                currentNode.add(childNode);
            }

            currentNode = childNode.children;
        });

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

            const directories = path.split('/');
            const fileName = directories[directories.length - 1];

            // find test item of file
            const testItem = testItemUtils.findTestItemById(this.testController.items, fileName);

            if (!testItem) {
                this.addFileToTestExplorer(path, result.files[path]);
            }
            else {
                const currentMutantTestItems = testItem.children;

                // remove mutants that are not in the new result
                for (const [id, testItem] of currentMutantTestItems) {
                    const mutant = mutants.find(mutant => this.getMutantId(mutant) === id);
                    if (!mutant) {
                        currentMutantTestItems.delete(id);
                    }
                }

                // add new mutants
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