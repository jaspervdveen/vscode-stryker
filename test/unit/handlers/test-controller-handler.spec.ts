import { describe, it, beforeEach, afterEach, before } from 'mocha';
import * as vscode from 'vscode';
import * as schema from 'mutation-testing-report-schema';
import { expect } from 'chai';

import { TestControllerHandler } from '../../../src/handlers/test-controller-handler';

describe('testControllerHandler', () => {
  let controller: vscode.TestController;
  let handler: TestControllerHandler;

  before(() => {
    vscode.workspace.updateWorkspaceFolders(0, 1, { uri: vscode.Uri.parse('workspace'), name: 'workspace' });
  });

  beforeEach(() => {
    controller = vscode.tests.createTestController('name', 'displayName');
    handler = new TestControllerHandler(controller);
  });

  afterEach(() => {
    controller.dispose();
  });

  describe('addMutantToTestExplorer', () => {
    it('should add test item at correct place in tree', function () {
      const filePath = 'lets/test/file.ts';

      const mutant: schema.MutantResult = {
        id: '1',
        location: {
          end: { column: 1, line: 1 },
          start: { column: 1, line: 1 },
        },
        mutatorName: 'mutator',
        replacement: 'replacement',
        status: 'Killed',
      };

      handler.addMutantToTestExplorer(filePath, mutant);

      const item = controller.items.get('lets')?.children.get('test')?.children.get('file.ts');
      expect(item).to.not.be.undefined;
    });

    it('should add mutant with correct properties', function () {
      const filePath = 'new/file.ts';
      const mutant: schema.MutantResult = {
        id: '3', // Unique ID for the mutant
        location: { end: { column: 3, line: 3 }, start: { column: 2, line: 2 } },
        mutatorName: 'mutator3',
        replacement: 'replacement3',
        status: 'Survived',
      };

      const addedTestItem = handler.addMutantToTestExplorer(filePath, mutant);

      expect(addedTestItem).to.not.be.undefined; // Ensure the test item is added
      expect(addedTestItem.label).to.equal(`${mutant.mutatorName} (2:2)`); // Check label
      expect(addedTestItem.id).to.equal('mutator3(2:2-3:3) (replacement3)'); // Check ID
      expect(addedTestItem.range?.start).to.deep.equal(new vscode.Position(1, 1)); // Check start position
      expect(addedTestItem.range?.end).to.deep.equal(new vscode.Position(2, 2)); // Check end position
      expect(addedTestItem.children.size).to.equal(0); // Ensure no children are added
      expect(addedTestItem.uri).to.deep.equal(vscode.Uri.file('workspace/new/file.ts')); // Check URI
    });
  });
});
