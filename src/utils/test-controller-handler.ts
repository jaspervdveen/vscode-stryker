import { FileResultDictionary, MutantResult, MutationTestResult } from "../api/schema";
import { TestItemNode } from "../api/test-item-node";
import * as vscode from 'vscode';

export class TestControllerHandler {
    private testController: vscode.TestController;

    constructor(testController: vscode.TestController) {
        this.testController = testController;
    }

    public updateTestExplorer(mutationReport: MutationTestResult) {
        const testItemNodes = this.createTestItemNodeTree(mutationReport.files);
        const testItems = this.createTestItems(testItemNodes);

        this.testController.items.replace(testItems);
    }

    private createTestItems(testItemNodes: TestItemNode[]): vscode.TestItem[] {
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

    private createTestItem(mutant: MutantResult, fileUri: vscode.Uri): vscode.TestItem {
        const mutantId = `${mutant.mutatorName}(${mutant.location.start.line}:${mutant.location.start.column}-${mutant.location.end.line}:${mutant.location.end.column}) (${mutant.replacement})`;
        const testItem = this.testController.createTestItem(mutantId, `${mutant.mutatorName} (${mutant.location.start.line}:${mutant.location.start.column})`, fileUri);

        testItem.range = new vscode.Range(
            new vscode.Position(mutant.location.start.line, mutant.location.start.column),
            new vscode.Position(mutant.location.end.line, mutant.location.end.column)
        );

        return testItem;
    }

    private createTestItemNodeTree(files: FileResultDictionary): TestItemNode[] {
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