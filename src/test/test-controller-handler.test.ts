import * as assert from 'assert';
import { TestControllerHandler } from '../handlers/test-controller-handler';
import * as vscode from 'vscode';
import { MutantResult, MutationTestResult } from 'mutation-testing-report-schema';
import { testItemUtils } from '../utils/test-item-utils';
import { FileTreeNode } from '../api/test-item-node';

suite('test-controller-handler', () => {

  let mutationReport: MutationTestResult = {
    schemaVersion: "1.0",
    thresholds: {
      high: 80,
      low: 60
    },
    files: {
      "src/services/myService.js": {
        language: "javascript",
        mutants: [
          {
            id: "1",
            location: {
              start: { line: 1, column: 1 },
              end: { line: 1, column: 2 }
            },
            mutatorName: "BinaryOperator",
            status: "Killed",
          },
          {
            id: "2",
            location: {
              start: { line: 2, column: 1 },
              end: { line: 2, column: 2 }
            },
            mutatorName: "LogicalOperator",
            status: "Survived",
          }
        ],
        source: "console.log('Hello, world!');"
      },
      "src/services/mySecondService.js": {
        language: "javascript",
        mutants: [
          {
            id: "1",
            location: {
              start: { line: 1, column: 1 },
              end: { line: 1, column: 2 }
            },
            mutatorName: "BinaryOperator",
            status: "Killed",
          },
        ],
        source: "console.log('Test myService');"
      },
      "src/util.js": {
        language: "javascript",
        mutants: [
          {
            id: "1",
            location: {
              start: { line: 1, column: 1 },
              end: { line: 1, column: 2 }
            },
            mutatorName: "BinaryOperator",
            status: "Killed",
          },
        ],
        source: "console.log('Cool util');"
      }
    }
  };

  let testController: vscode.TestController = vscode.tests.createTestController("id", "label");

  test('should create test item', () => {
    const testControllerHandler = new TestControllerHandler(testController);

    const mutantResult: MutantResult = {

      id: "1",
      location: {
        start: { line: 1, column: 1 },
        end: { line: 1, column: 2 }
      },
      mutatorName: "BinaryOperator",
      status: "Killed",
      replacement: "+"
    };

    const testItem = testItemUtils.createTestItem(mutantResult, vscode.Uri.file("src/services/myService.js"), testController);

    assert.strictEqual(testItem.id, "BinaryOperator(1:1-1:2) (+)");
    assert.strictEqual(testItem.label, "BinaryOperator (1:1)");
    assert.strictEqual(testItem.range?.end.line, 1);
    assert.strictEqual(testItem.range?.end.character, 2);
    assert.strictEqual(testItem.range?.start.line, 1);
    assert.strictEqual(testItem.range?.start.character, 1);
  });

  test('should create test item tree node', () => {
    const testItemNodes = testItemUtils.createNodeTree(mutationReport.files);

    assert.strictEqual(testItemNodes.length, 1);
    assert.strictEqual(testItemNodes[0].name, "src");
    assert.strictEqual(testItemNodes[0].children.length, 2);
    assert.strictEqual(testItemNodes[0].children[0].name, "services");
    assert.strictEqual(testItemNodes[0].children[0].children.length, 2);
    assert.strictEqual(testItemNodes[0].children[0].children[0].name, "myService.js");
    assert.strictEqual((testItemNodes[0].children[0].children[0] as FileTreeNode).mutants.length, 2);
    assert.strictEqual((testItemNodes[0].children[0].children[0] as FileTreeNode).relativePath, "src/services/myService.js");
    assert.strictEqual((testItemNodes[0].children[0].children[0] as FileTreeNode).mutants[0].id, "1");
    assert.strictEqual(testItemNodes[0].children[0].children[1].name, "mySecondService.js");
    assert.strictEqual((testItemNodes[0].children[0].children[1] as FileTreeNode).mutants.length, 1);
    assert.strictEqual(testItemNodes[0].children[1].name, "util.js");
    assert.strictEqual((testItemNodes[0].children[1] as FileTreeNode).mutants.length, 1);
  });
});