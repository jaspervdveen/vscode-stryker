import { MutantResult, MutationTestResult } from "mutation-testing-report-schema";
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

    deleteFromTestExplorer(result: MutationTestResult) {
        throw new Error('Method not implemented.');
    }

    addToTestExplorer(result: MutationTestResult): any {
        throw new Error('Method not implemented.');
    }

    public updateTestExplorerFromInstrumentRun(result: MutationTestResult) {
        Object.keys(result.files).forEach(path => {
            const mutants = result.files[path].mutants;

            const directories = path.split('/');
            const fileName = directories[directories.length - 1];

            // find test item of file
            const testItem = testItemUtils.findTestItemById(this.testController.items, fileName);

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