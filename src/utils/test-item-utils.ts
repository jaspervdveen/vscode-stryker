import * as vscode from 'vscode';
import { TestItemNode } from '../api/test-item-node';
import { FileResultDictionary, MutantResult } from 'mutation-testing-report-schema';

export const testItemUtils = {

    findFileTestItemByPath(collection: vscode.TestItemCollection, path: string): vscode.TestItem | undefined {
        const directories = path.split('/');
        const fileName = directories[directories.length - 1];

        let currentNode = collection;

        // Iterate through the directories to find the file test item in the tree
        for (const directory of directories) {
            let node = currentNode.get(directory);

            if (node && node.id === fileName) {
                return node;
            }

            if (!node) {
                return undefined;
            }

            currentNode = node.children;
        }
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