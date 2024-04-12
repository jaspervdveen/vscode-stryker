import * as vscode from 'vscode';
import { DefaultTreeNode, FileTreeNode, TreeNode } from '../api/test-item-node';
import { FileResultDictionary, MutantResult } from 'mutation-testing-report-schema';

export const testItemUtils = {

    findFileTestItemByPath(collection: vscode.TestItemCollection, path: string): vscode.TestItem | undefined {
        const directories = path.split('/');
        const fileName = directories[directories.length - 1];

        let currentNodes = collection;

        // Iterate through the directories to find the file test item in the tree
        for (const directory of directories) {
            let node = currentNodes.get(directory);

            if (node && node.id === fileName) {
                return node;
            }

            if (!node) {
                return undefined;
            }

            currentNodes = node.children;
        }
    },

    createTestItems(testItemNodes: TreeNode[], testController: vscode.TestController): vscode.TestItem[] {
        const testItems = testItemNodes.map(node => {
            let item: vscode.TestItem;

            if ((node as FileTreeNode).relativePath) {
                let fileTreeNode = node as FileTreeNode;

                const fileUri = vscode.Uri.file(`${vscode.workspace.workspaceFolders![0].uri.fsPath}/${fileTreeNode.relativePath}`);

                item = testController.createTestItem(node.name, node.name, fileUri);

                fileTreeNode.mutants.forEach(mutant => {
                    const testItem = this.createTestItem(mutant, fileUri, testController);
                    item.children.add(testItem);
                });
            } else {
                item = testController.createTestItem(node.name, node.name);

                item.children.replace(this.createTestItems(node.children, testController));
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

    createNodeTree(files: FileResultDictionary): TreeNode[] {
        let result: TreeNode[] = [];
        let level: { result: TreeNode[] } = { result };

        Object.keys(files).forEach(path => {
            const mutants = files[path].mutants;

            const directories = path.split('/');
            const fileName = directories[directories.length - 1];

            directories.reduce((currentLevel: any, dirName: string) => {
                if (!currentLevel[dirName]) {
                    currentLevel[dirName] = { result: [] };

                    const isFile = dirName === fileName;

                    let testItem: TreeNode;

                    if (isFile) {
                        testItem = {
                            name: dirName,
                            children: [],
                            mutants,
                            relativePath: path,
                        } as FileTreeNode;
                    } else {
                        testItem = {
                            name: dirName,
                            children: currentLevel[dirName].result,
                        } as DefaultTreeNode;
                    }

                    currentLevel.result.push(testItem);
                }

                return currentLevel[dirName];
            }, level);
        });

        return result;
    },
};