import { FileResultDictionary, MutantResult, MutationTestResult } from "mutation-testing-report-schema";
import { TestItemNode } from "../api/test-item-node";
import * as vscode from 'vscode';

export class TestControllerHandler {
    private testController: vscode.TestController;

    constructor(testController: vscode.TestController) {
        this.testController = testController;
    }

    private getMutantId(mutant: MutantResult): string {
        return `${mutant.mutatorName}(${mutant.location.start.line}:${mutant.location.start.column}-${mutant.location.end.line}:${mutant.location.end.column}) (${mutant.replacement})`;
    }

    public replaceTestExplorerContent(mutationReport: MutationTestResult) {
        const testItemNodes = this.createTestItemNodeTree(mutationReport.files);
        const testItems = this.createTestItems(testItemNodes);

        this.testController.items.replace(testItems);
    }

    public updateTestExplorerFromInstrumentRun(result: MutationTestResult) {
        Object.keys(result.files).forEach(path => {
            const mutants = result.files[path].mutants;

            const directories = path.split('/');
            const fileName = directories[directories.length - 1];

            // find test item of file
            const testItem = this.getTestItemRecursiveFromArray(this.ToTestItemArray(this.testController.items), fileName);

            if (testItem) {
                console.log('Found test item for file: ', fileName);

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
                        const testItem = this.createTestItem(mutant, vscode.Uri.file(`${vscode.workspace.workspaceFolders![0].uri.fsPath}/${path}`));
                        currentMutantTestItems.add(testItem);
                    }
                });
            }
        });

    }

    public getTestItemRecursiveFromArray(testItems: vscode.TestItem[], id: string): vscode.TestItem | undefined {
        for (let i = 0; i < testItems.length; i++) {
            const testItem = testItems[i];
            if (testItem.id === id) {
                return testItem;
            }

            const found = this.getTestItemRecursive(testItem, id);
            if (found) {
                return found;
            }
        }

        return undefined;
    }

    public getTestItemRecursive(testItem: vscode.TestItem, id: string): vscode.TestItem | undefined {
        if (testItem.id === id) {
            return testItem;
        }

        for (const child of testItem.children) {
            const found = this.getTestItemRecursive(child[1], id);
            if (found) {
                return found;
            }
        }

        return undefined;
    }

    private ToTestItemArray(tests: vscode.TestItemCollection): vscode.TestItem[] {
        const result: vscode.TestItem[] = [];
    
        for (const test of tests) {
            result.push(test[1]);
            result.push(...this.ToTestItemArray(test[1].children));
        }
    
        return result;
    }


    public createTestItems(testItemNodes: TestItemNode[]): vscode.TestItem[] {
        const testItems = testItemNodes.map(node => {
            const fileUri = node.fullPath ? vscode.Uri.file(`${vscode.workspace.workspaceFolders![0].uri.fsPath}/${node.fullPath}`) : undefined;

            const item = this.testController.createTestItem(node.name, node.name, fileUri);
            item.canResolveChildren = true;
            if (node.children.length > 0) {
                item.children.replace(this.createTestItems(node.children));
            } else {
                node.mutants.forEach(mutant => {
                    const testItem = this.createTestItem(mutant, fileUri!);
                    item.children.add(testItem);
                });
            }

            return item;
        });

        return testItems;
    }

    public createTestItem(mutant: MutantResult, fileUri: vscode.Uri): vscode.TestItem {
        const mutantId = `${mutant.mutatorName}(${mutant.location.start.line}:${mutant.location.start.column}-${mutant.location.end.line}:${mutant.location.end.column}) (${mutant.replacement})`;
        const testItem = this.testController.createTestItem(mutantId, `${mutant.mutatorName} (${mutant.location.start.line}:${mutant.location.start.column})`, fileUri);

        testItem.range = new vscode.Range(
            new vscode.Position(mutant.location.start.line, mutant.location.start.column),
            new vscode.Position(mutant.location.end.line, mutant.location.end.column)
        );

        return testItem;
    }

    public createTestItemNodeTree(files: FileResultDictionary): TestItemNode[] {
        let result: TestItemNode[] = [];
        let level: { result: TestItemNode[] } = { result };

        Object.keys(files).forEach(path => {
            const mutants = files[path].mutants;

            const directories = path.split('/');
            const fileName = directories[directories.length - 1];

            directories.reduce((curLevel: any, dirName: string) => {
                if (!curLevel[dirName]) {
                    curLevel[dirName] = { result: [] };

                    const isFile = dirName === fileName;

                    curLevel.result.push({
                        name: dirName,
                        children: curLevel[dirName].result,
                        mutants: isFile ? mutants : [],
                        fullPath: isFile ? path : undefined,
                    });
                }

                return curLevel[dirName];
            }, level);
        });

        return result;
    }
}