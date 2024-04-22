import { beforeEach, afterEach } from 'mocha';
import * as vscode from 'vscode';
import * as schema from 'mutation-testing-report-schema';
import { expect } from 'chai';
import sinon from 'sinon';

import { TestControllerHandler } from '../../../src/handlers/test-controller-handler';

suite('testControllerHandler', () => {
  let controller: vscode.TestController;
  let handler: TestControllerHandler;

  const exampleMutant: schema.MutantResult = {
    id: '1',
    location: {
      start: { line: 8, column: 4 },
      end: { line: 6, column: 10 },
    },
    mutatorName: 'ArrayDeclaration',
    replacement: '[]',
    status: 'Pending',
  };

  beforeEach(() => {
    controller = vscode.tests.createTestController('name', 'displayName');
    handler = new TestControllerHandler(controller);
  });

  afterEach(() => {
    controller.dispose();
  });

  suite('addMutantToTestExplorer', () => {
    test('should add test item at correct place in tree', () => {
      // Arrange
      const filePath = 'lets/test/file.ts';

      // Act
      handler.addMutantToTestExplorer(filePath, exampleMutant);

      // Assert
      const letsDirectory = controller.items.get('lets');
      expect(letsDirectory).to.not.be.undefined;
      const testDirectory = letsDirectory?.children.get('test');
      expect(testDirectory).to.not.be.undefined;
      const fileItem = testDirectory?.children.get('file.ts');
      expect(fileItem).to.not.be.undefined;
    });

    test('should add mutant with correct properties', () => {
      // Arrange
      const filePath = 'lets/test/file.ts';

      // Act
      const addedTestItem = handler.addMutantToTestExplorer(filePath, exampleMutant);

      // Assert
      expect(addedTestItem).to.not.be.undefined;
      expect(addedTestItem.label).to.equal(
        `${exampleMutant.mutatorName} (${exampleMutant.location.start.line}:${exampleMutant.location.start.column})`,
      );
      expect(addedTestItem.id).to.equal(
        `${exampleMutant.mutatorName}(${exampleMutant.location.start.line}:${exampleMutant.location.start.column}-${exampleMutant.location.end.line}:${exampleMutant.location.end.column}) (${exampleMutant.replacement})`,
      );
      expect(addedTestItem.range).to.deep.equal(
        new vscode.Range(
          new vscode.Position(exampleMutant.location.start.line - 1, exampleMutant.location.start.column - 1),
          new vscode.Position(exampleMutant.location.end.line - 1, exampleMutant.location.end.column - 1),
        ),
      );
      expect(addedTestItem.children.size).to.equal(0);
      expect(addedTestItem.uri).to.be.not.undefined;
      expect(vscode.workspace.asRelativePath(addedTestItem.uri!)).to.deep.equal(filePath);
    });
  });

  suite('invalidateTestResults', () => {
    test('should invalidate test results', () => {
      // Arrange
      const spy = sinon.spy(controller, 'invalidateTestResults');

      // Act
      handler.invalidateTestResults();

      // Assert
      expect(spy.calledOnce).to.be.true;
    });
  });

  suite('deleteFromTestExplorer', () => {
    test('should delete path from test explorer and parent directories without tests', () => {
      // Arrange
      handler.addMutantToTestExplorer('lets/test/file.ts', exampleMutant);

      // Act
      handler.deleteFromTestExplorer(['lets/test/file.ts']);

      // Assert
      expect(controller.items.size).to.equal(0);
    });

    test('should delete but not touch remaining test items', () => {
      // Arrange
      handler.addMutantToTestExplorer('lets/test/file_one.ts', exampleMutant);
      handler.addMutantToTestExplorer('lets/test/file_two.ts', exampleMutant);
      handler.addMutantToTestExplorer('lets/file_three.ts', exampleMutant);

      // Act
      handler.deleteFromTestExplorer(['lets/test/file_one.ts', 'lets/test/file_two.ts']);

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
});
