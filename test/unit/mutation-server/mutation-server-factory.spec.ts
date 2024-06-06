import childProcess from 'child_process';
import { EventEmitter } from 'events';
import { PassThrough, Readable } from 'stream';
import * as os from 'os';

import sinon from 'sinon';
import * as vscode from 'vscode';
import { expect } from 'chai';

import { MutationServerFactory } from '../../../src/mutation-server/mutation-server-factory';
import { Logger } from '../../../src/utils/logger';
import { config } from '../../../src/config';
import { WebSocketTransporter } from '../../../src/mutation-server/transport/web-socket-transporter';
import { MutationServer } from '../../../src/mutation-server/mutation-server';

class ChildProcessMock extends EventEmitter {
  public stdout: Readable = new PassThrough();
  public stderr: Readable = new PassThrough();
  public pid: number | undefined = 1234;
}

describe(MutationServerFactory.name, () => {
  let loggerStub: sinon.SinonStubbedInstance<Logger>;
  let factory: MutationServerFactory;
  let spawnStub: sinon.SinonStub;
  let childProcessMock: ChildProcessMock;
  let initializeStub: sinon.SinonStub;
  let workspaceFolderMock: vscode.WorkspaceFolder;
  let transporterStub: sinon.SinonStub;

  beforeEach(() => {
    loggerStub = sinon.createStubInstance(Logger);
    factory = new MutationServerFactory(loggerStub);
    childProcessMock = new ChildProcessMock();
    spawnStub = sinon.stub(childProcess, 'spawn');
    spawnStub.returns(childProcessMock);
    initializeStub = sinon.stub(MutationServer.prototype, 'initialize').resolves();
    workspaceFolderMock = { name: 'Example', index: 0, uri: vscode.Uri.parse('file:///path/to/folder') };
    transporterStub = sinon.stub(WebSocketTransporter, 'create').resolves(sinon.createStubInstance(WebSocketTransporter));
  });

  afterEach(() => {
    sinon.restore(); // Restores the default sandbox
  });

  describe(MutationServerFactory.prototype.create.name, async () => {
    it('should use os default executable path if not overwritten by extension config', async () => {
      // Arrange
      const fake = sinon.fake.returns({
        get: sinon.stub().returns(undefined), // Simulate executable path not being set
      } as any);
      sinon.replace(vscode.workspace, 'getConfiguration', fake);

      const path = os.type() === 'Windows_NT' ? config.app.defaultWindowsExecutablePath : config.app.defaultUnixExecutablePath;

      // Act
      await factory.create(workspaceFolderMock);

      // Assert
      expect(spawnStub.calledOnce).to.be.true;
      expect(spawnStub.calledWith(path, sinon.match({ cwd: workspaceFolderMock.uri.fsPath }))).to.be.true;
    });

    it('should fail if process spawn fails', async () => {
      const fake = sinon.fake.returns({
        get: sinon.stub().returns('test'), // Simulate non-existing executable path being set
      } as any);

      sinon.replace(vscode.workspace, 'getConfiguration', fake);

      childProcessMock.pid = undefined; // Simulate spawn failure
      spawnStub.returns(childProcessMock);

      try {
        // Call the method under test
        await factory.create(workspaceFolderMock);
        // If the above line does not throw an error, the test should fail
        expect.fail('Expected an error to be thrown when process spawn fails');
      } catch (error) {
        expect((error as Error).message).to.equal(config.errors.mutationServerProcessSpawnFailed);
      }
    });

    it('should start mutation server process and setup transporter', async () => {
      // Act
      await factory.create(workspaceFolderMock);

      // Assert
      expect(spawnStub.calledOnce).to.be.true;
      expect(spawnStub.calledWith(sinon.match.string, sinon.match({ cwd: workspaceFolderMock.uri.fsPath }))).to.be.true;
      expect(transporterStub.calledOnce).to.be.true;
    });

    it('should initialize mutation server with config file path if set in workspace config', async () => {
      const fake = sinon.fake.returns({
        get: sinon.stub().returns('path'),
      } as any);

      sinon.replace(vscode.workspace, 'getConfiguration', fake);

      // Act
      await factory.create(workspaceFolderMock);

      // Assert
      expect(initializeStub.calledOnceWithExactly({ configUri: 'path' })).to.be.true;
    });

    it('should initialize mutation server without config file path if not set in workspace config', async () => {
      const fake = sinon.fake.returns({
        get: sinon.stub().returns(undefined),
      } as any);

      sinon.replace(vscode.workspace, 'getConfiguration', fake);

      // Act
      await factory.create(workspaceFolderMock);

      // Assert
      expect(initializeStub.calledOnceWithExactly({})).to.be.true;
    });

    it('should initialize mutation server without config file if config file path is empty', async () => {
      const fake = sinon.fake.returns({
        get: sinon.stub().returns(''),
      } as any);

      sinon.replace(vscode.workspace, 'getConfiguration', fake);

      // Act
      await factory.create(workspaceFolderMock);

      // Assert
      expect(initializeStub.calledOnceWithExactly({})).to.be.true;
    });

    it('should log server process output', async () => {
      // Arrange
      await factory.create(workspaceFolderMock);

      // Act
      const outputMessage = 'Server is listening on port: 1234';
      childProcessMock.stdout.emit('data', outputMessage);

      const errorMessage = 'Error occurred';
      childProcessMock.stderr.emit('data', errorMessage);

      const exitCode = 1;
      childProcessMock.emit('exit', exitCode);

      // Assert
      expect(loggerStub.logInfo.calledTwice).to.be.true;
      expect(loggerStub.logInfo.calledWith(`[Mutation Server Process] ${outputMessage}`, workspaceFolderMock.name)).to.be.true;
      expect(loggerStub.logInfo.calledWith(`[Mutation Server Process] Exited with code ${exitCode}`, workspaceFolderMock.name)).to.be.true;
      expect(loggerStub.logError.calledOnceWith(`[Mutation Server Process] ${errorMessage}`, workspaceFolderMock.name)).to.be.true;
    });
  });
});
