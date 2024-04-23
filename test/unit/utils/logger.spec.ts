import sinon from 'sinon';

import * as vscode from 'vscode';

import { Logger } from '../../../src/utils/logger';

suite('Logger', function () {
  let createOutputChannelStub: sinon.SinonStub;
  let outputChannelMock: { appendLine: sinon.SinonStub };
  const sandbox: sinon.SinonSandbox = sinon.createSandbox();

  setup(() => {
    createOutputChannelStub = sandbox.stub(vscode.window, 'createOutputChannel');
    outputChannelMock = createMockOutputChannel();
    createOutputChannelStub.returns(outputChannelMock);
  });

  teardown(() => {
    createOutputChannelStub.restore();
    sandbox.restore();
  });

  suite('logError', () => {
    test('should append error message to output channel', () => {
      const errorMessage = 'Test error message';
      new Logger().logError(errorMessage);

      sinon.assert.calledOnceWithExactly(outputChannelMock.appendLine, `[ERROR] ${errorMessage}`);
    });
  });

  suite('logInfo', () => {
    test('should append info message to output channel', () => {
      const infoMessage = 'Test info message';
      new Logger().logInfo(infoMessage);

      sinon.assert.calledOnceWithExactly(outputChannelMock.appendLine, `[INFO] ${infoMessage}`);
    });
  });

  suite('errorNotification', () => {
    test('should show error message notification', () => {
      const errorMessage = 'Test error message';

      const spy = sandbox.spy(vscode.window, 'showErrorMessage');

      void new Logger().errorNotification(errorMessage);

      sinon.assert.calledWith(spy, errorMessage);
    });
  });

  suite('infoNotification', () => {
    test('should show info message notification', () => {
      const infoMessage = 'Test info message';

      const spy = sandbox.spy(vscode.window, 'showInformationMessage');

      void new Logger().infoNotification(infoMessage);

      sinon.assert.calledWith(spy, infoMessage);
    });
  });

  suite('warningNotification', () => {
    test('should show warning message notification', () => {
      const warningMessage = 'Test warning message';

      const spy = sandbox.spy(vscode.window, 'showWarningMessage');

      void new Logger().warningNotification(warningMessage);

      sinon.assert.calledWith(spy, warningMessage);
    });
  });
});

function createMockOutputChannel() {
  return {
    appendLine: sinon.stub(),
  };
}
