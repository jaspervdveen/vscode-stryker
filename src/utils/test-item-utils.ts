import * as vscode from 'vscode';
import { TestItemNode } from '../api/test-item-node';
import { FileResultDictionary, MutantResult } from 'mutation-testing-report-schema';

export const testItemUtils = {

    findTestItemById(collection: vscode.TestItemCollection, id: string): vscode.TestItem | undefined {
        for (const testItem of collection) {
            if (testItem[1].id === id) {
                return testItem[1];
            }

            const found = this.findTestItemById(testItem[1].children, id);
            if (found) {
                return found;
            }
        }

        return undefined;
    },

    createTestItems(testItemNodes: TestItemNode[], testController: vscode.TestController): vscode.TestItem[] {
        const testItems = testItemNodes.map(node => {
            const fileUri = node.fullPath ? vscode.Uri.file(`${vscode.workspace.workspaceFolders![0].uri.fsPath}/${node.fullPath}`) : undefined;

            const item = testController.createTestItem(node.name, node.name, fileUri);
            item.canResolveChildren = true;
            if (node.children.length > 0) {
                item.children.replace(this.createTestItems(node.children, testController));
            } else {
                node.mutants.forEach(mutant => {
                    const testItem = this.createTestItem(mutant, fileUri!, testController);
                    item.children.add(testItem);
                });
            }

            return item;
        });

        return testItems;
    },

    createTestItem(mutant: MutantResult, fileUri: vscode.Uri, testController: vscode.TestController): vscode.TestItem {
        const mutantId = `${mutant.mutatorName}(${mutant.location.start.line}:${mutant.location.start.column}-${mutant.location.end.line}:${mutant.location.end.column}) (${mutant.replacement})`;
        const testItem = testController.createTestItem(mutantId, `${mutant.mutatorName} (${mutant.location.start.line}:${mutant.location.start.column})`, fileUri);

        testItem.range = new vscode.Range(
            new vscode.Position(mutant.location.start.line, mutant.location.start.column),
            new vscode.Position(mutant.location.end.line, mutant.location.end.column)
        );

        return testItem;
    },

    createTestItemNodeTree(files: FileResultDictionary): TestItemNode[] {
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
    },
};