import sinon from 'sinon';
import { describe, it, beforeEach, afterEach } from 'mocha';

import * as vscode from 'vscode';

import { Logger } from '../../../src/utils/logger';

describe('Logger', function () {
  let createOutputChannelStub: sinon.SinonStub;
  let outputChannelMock: { appendLine: sinon.SinonStub };

  beforeEach(() => {
    createOutputChannelStub = sinon.stub(vscode.window, 'createOutputChannel');
    outputChannelMock = createMockOutputChannel();
    createOutputChannelStub.returns(outputChannelMock);
  });

  afterEach(() => {
    createOutputChannelStub.restore();
  });

  describe('logError', function () {
    it('should append error message to output channel', function () {
      const errorMessage = 'Test error message';
      new Logger().logError(errorMessage);

      sinon.assert.calledOnceWithExactly(outputChannelMock.appendLine, `[ERROR] ${errorMessage}`);
    });
  });

  describe('logInfo', function () {
    it('should append info message to output channel', function () {
      const infoMessage = 'Test info message';
      new Logger().logInfo(infoMessage);

      sinon.assert.calledOnceWithExactly(outputChannelMock.appendLine, `[INFO] ${infoMessage}`);
    });
  });

  describe('errorNotification', () => {
    it('should show error message notification', async function () {
      const errorMessage = 'Test error message';

      const spy = sinon.spy(vscode.window, 'showErrorMessage');

      void new Logger().errorNotification(errorMessage);

      sinon.assert.calledWith(spy, errorMessage);
    });
  });

  describe('infoNotification', () => {
    it('should show info message notification', async function () {
      const infoMessage = 'Test info message';

      const spy = sinon.spy(vscode.window, 'showInformationMessage');

      void new Logger().infoNotification(infoMessage);

      sinon.assert.calledWith(spy, infoMessage);
    });
  });

  describe('warningNotification', () => {
    it('should show warning message notification', async function () {
      const warningMessage = 'Test warning message';

      const spy = sinon.spy(vscode.window, 'showWarningMessage');

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
