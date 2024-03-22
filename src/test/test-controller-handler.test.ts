import * as assert from 'assert';
import { TestControllerHandler } from '../utils/test-controller-handler';
import { MutantResult, MutationTestResult } from '../api/schema';
import * as vscode from 'vscode';

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

    const testItem = testControllerHandler.createTestItem(mutantResult, vscode.Uri.file("src/services/myService.js"));

    assert.strictEqual(testItem.id, "BinaryOperator(1:1-1:2) (+)");
    assert.strictEqual(testItem.label, "BinaryOperator (1:1)");
    assert.strictEqual(testItem.range?.end.line, 1);
    assert.strictEqual(testItem.range?.end.character, 2);
    assert.strictEqual(testItem.range?.start.line, 1);
    assert.strictEqual(testItem.range?.start.character, 1);
  });

  test('should create test item tree node', () => {
    const testControllerHandler = new TestControllerHandler(testController);

    const testItemNodes = testControllerHandler.createTestItemNodeTree(mutationReport.files);

    assert.strictEqual(testItemNodes.length, 1);
    assert.strictEqual(testItemNodes[0].name, "src");
    assert.strictEqual(testItemNodes[0].children.length, 2);
    assert.strictEqual(testItemNodes[0].children[0].name, "services");
    assert.strictEqual(testItemNodes[0].children[0].children.length, 2);
    assert.strictEqual(testItemNodes[0].children[0].children[0].name, "myService.js");
    assert.strictEqual(testItemNodes[0].children[0].children[0].mutants.length, 2);
    assert.strictEqual(testItemNodes[0].children[0].children[0].fullPath, "src/services/myService.js");
    assert.strictEqual(testItemNodes[0].children[0].children[0].mutants[0].id, "1");
    assert.strictEqual(testItemNodes[0].children[0].children[1].name, "mySecondService.js");
    assert.strictEqual(testItemNodes[0].children[0].children[1].mutants.length, 1);
    assert.strictEqual(testItemNodes[0].children[1].name, "util.js");
    assert.strictEqual(testItemNodes[0].children[1].mutants.length, 1);
    assert.strictEqual(testItemNodes[0].mutants.length, 0);
    assert.strictEqual(testItemNodes[0].fullPath, undefined);
  });
});