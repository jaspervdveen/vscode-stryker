import * as vscode from 'vscode';
import * as schema from 'mutation-testing-report-schema';
import { expect } from 'chai';
import sinon from 'sinon';

import { TestControllerHandler } from '../../../src/handlers/test-controller-handler';
import { MutantResult } from '../../../src/api/mutant-result';

describe('testControllerHandler', () => {
  let controller: vscode.TestController;
  let handler: TestControllerHandler;
  let workspaceFolderPath: string;

  const exampleMutants: schema.MutantResult[] = [
    {
      id: '1',
      location: {
        start: { line: 8, column: 4 },
        end: { line: 6, column: 10 },
      },
      mutatorName: 'ArrayDeclaration',
      replacement: '[]',
      status: 'Pending',
    },
    {
      id: '2',
      location: {
        start: { line: 4, column: 2 },
        end: { line: 4, column: 4 },
      },
      mutatorName: 'BlockStatement',
      replacement: '{}',
      status: 'Pending',
    },
    {
      id: '3',
      location: {
        start: { line: 6, column: 2 },
        end: { line: 6, column: 4 },
      },
      mutatorName: 'StringLiteral',
      replacement: "''",
      status: 'Pending',
    },
  ];

  before(() => {
    workspaceFolderPath = vscode.workspace.workspaceFolders![0].uri.path;
  });

  beforeEach(() => {
    controller = vscode.tests.createTestController('name', 'displayName');
    const [workspaceFolder] = vscode.workspace.workspaceFolders!; // There is always at least one workspace folder during tests
    handler = new TestControllerHandler(controller, workspaceFolder);
  });

  afterEach(() => {
    controller.dispose();
    sinon.restore();
  });

  describe('addMutantToTestExplorer', () => {
    it('should add test item at correct place in tree', () => {
      // Arrange
      const [exampleMutant] = exampleMutants;
      const fileUri = vscode.Uri.file(`${workspaceFolderPath}/lets/test/file.ts`);

      // Act
      handler.addMutantToTestExplorer(fileUri, exampleMutant);

      // Assert
      const letsDirectory = controller.items.get('lets');
      expect(letsDirectory).to.not.be.undefined;
      expect(letsDirectory!.uri).to.not.be.undefined;
      expect(letsDirectory!.uri!.path).to.deep.equal(`${workspaceFolderPath}/lets`);
      const testDirectory = letsDirectory?.children.get('test');
      expect(testDirectory).to.not.be.undefined;
      expect(testDirectory!.uri).to.not.be.undefined;
      expect(testDirectory!.uri!.path).to.deep.equal(`${workspaceFolderPath}/lets/test`);
      const fileItem = testDirectory?.children.get('file.ts');
      expect(fileItem).to.not.be.undefined;
    });

    it('should add mutant with correct properties', () => {
      // Arrange
      const fileUri = vscode.Uri.file(`${workspaceFolderPath}/lets/test/file.ts`);
      const [exampleMutant] = exampleMutants;

      // Act
      const addedTestItem = handler.addMutantToTestExplorer(fileUri, exampleMutant);

      // Assert
      expect(addedTestItem).to.not.be.undefined;
      expect(addedTestItem.label).to.equal(
        `${exampleMutant.mutatorName} (${exampleMutant.location.start.line}:${exampleMutant.location.start.column})`,
      );
      expect(addedTestItem.id).to.equal(createMutantId(exampleMutant));
      expect(addedTestItem.range).to.deep.equal(
        new vscode.Range(
          new vscode.Position(exampleMutant.location.start.line - 1, exampleMutant.location.start.column - 1),
          new vscode.Position(exampleMutant.location.end.line - 1, exampleMutant.location.end.column - 1),
        ),
      );
      expect(addedTestItem.children.size).to.equal(0);
      expect(addedTestItem.uri).to.be.not.undefined;
      expect(addedTestItem.uri!.path).to.deep.equal(fileUri.path);
    });

    describe('invalidateTestResults', () => {
      it('should invalidate test results', () => {
        // Arrange
        const spy = sinon.spy(controller, 'invalidateTestResults');

        // Act
        handler.invalidateTestResults();

        // Assert
        expect(spy.calledOnce).to.be.true;
      });
    });

    describe('deleteFromTestExplorer', () => {
      it('should delete path from test explorer and parent directories without tests', () => {
        // Arrange
        const [exampleMutant] = exampleMutants;
        const fileUri = vscode.Uri.file(`${workspaceFolderPath}/lets/test/file.ts`);
        handler.addMutantToTestExplorer(fileUri, exampleMutant);
        // Act
        handler.deleteFromTestExplorer([fileUri]);
        // Assert
        expect(controller.items.size).to.equal(0);
      });
      it('should delete but not touch remaining test items', () => {
        // Arrange
        const [exampleMutant] = exampleMutants;
        const fileOneUri = vscode.Uri.file(`${workspaceFolderPath}/lets/test/file_one.ts`);
        const fileTwoUri = vscode.Uri.file(`${workspaceFolderPath}/lets/test/file_two.ts`);
        const fileThreeUri = vscode.Uri.file(`${workspaceFolderPath}/lets/file_three.ts`);
        handler.addMutantToTestExplorer(fileOneUri, exampleMutant);
        handler.addMutantToTestExplorer(fileTwoUri, exampleMutant);
        handler.addMutantToTestExplorer(fileThreeUri, exampleMutant);
        // Act
        handler.deleteFromTestExplorer([fileOneUri, fileTwoUri]);
        // Assert
        expect(controller.items.size).to.equal(1);
        const letsDirectory = controller.items.get('lets');
        expect(letsDirectory).to.not.be.undefined;
        expect(letsDirectory!.children.size).to.equal(1);
        const testDirectory = letsDirectory!.children.get('test');
        expect(testDirectory).to.be.undefined;
        const fileThree = letsDirectory!.children.get('file_three.ts');
        expect(fileThree).to.not.be.undefined;
        expect(fileThree!.children.size).to.equal(1);
      });
    });

    describe('updateTestExplorerFromInstrumentRun', () => {
      it('should add mutant result at correct place in tree', () => {
        const [exampleMutant] = exampleMutants;
        const mutantResult: MutantResult = {
          ...exampleMutant,
          fileName: 'folder1/folder2/file.ts',
          replacement: '[]',
        };

        sinon.stub(vscode.workspace, 'asRelativePath').returns('folder1/folder2/file.ts');

        handler.updateTestExplorerFromInstrumentRun([mutantResult]);

        const folder1 = controller.items.get('folder1');
        expect(folder1).to.not.be.undefined;
        const folder2 = folder1!.children.get('folder2');
        expect(folder2).to.not.be.undefined;
        const file = folder2!.children.get('file.ts');
        expect(file).to.not.be.undefined;
        expect(file!.children.size).to.equal(1);
      });

      it('should remove mutants in file test item that are not present in new instrument run result', () => {
        // Arrange
        const originalMutants: MutantResult[] = exampleMutants.map((mutant) => ({
          ...mutant,
          fileName: 'folder1/folder2/file.ts',
          replacement: '[]',
        }));

        // Simulate that the second mutant is not present in the new instrument run result
        const instrumentResults = [originalMutants[0], originalMutants[2]];

        sinon.stub(vscode.workspace, 'asRelativePath').returns('folder1/folder2/file.ts');

        originalMutants.forEach((mutant) => handler.addMutantToTestExplorer(vscode.Uri.file(`${workspaceFolderPath}/${mutant.fileName}`), mutant));

        // Act
        handler.updateTestExplorerFromInstrumentRun(instrumentResults);

        // Assert
        const folder1 = controller.items.get('folder1');
        expect(folder1).to.not.be.undefined;
        const folder2 = folder1!.children.get('folder2');
        expect(folder2).to.not.be.undefined;
        const file = folder2!.children.get('file.ts');
        expect(file).to.not.be.undefined;
        expect(file!.children.size).to.equal(2);
        const mutants = file!.children;
        const removedMutant = mutants.get(createMutantId(originalMutants[1]));
        expect(removedMutant).to.be.undefined;
      });
    });

    function createMutantId(mutant: schema.MutantResult): string {
      return `${mutant.mutatorName}(${mutant.location.start.line}:${mutant.location.start.column}-${mutant.location.end.line}:${mutant.location.end.column}) (${mutant.replacement})`;
    }
  });
});
