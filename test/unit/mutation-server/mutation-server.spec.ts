import EventEmitter from 'events';

import sinon from 'sinon';
import { expect, use } from 'chai';
import { createJSONRPCNotification, createJSONRPCSuccessResponse } from 'json-rpc-2.0';
import chaiAsPromised from 'chai-as-promised';

import { MutationServer } from '../../../src/mutation-server/mutation-server';
import { Transporter } from '../../../src/mutation-server/transport/transporter';
import { Logger } from '../../../src/utils/logger';
import {
  InitializeParams,
  InstrumentParams,
  MutationTestParams,
  MutationTestPartialResult,
  ServerCapabilities,
} from '../../../src/mutation-server/mutation-server-protocol';
import { MutantResult } from '../../../src/api/mutant-result';

use(chaiAsPromised);

class TransporterMock extends EventEmitter implements Transporter {
  public send() {
    // Empty as it will be replaced by sinon
  }
}

const mutants: MutantResult[] = [
  {
    fileName: 'exampleFile1.ts',
    replacement: 'newValue',
    status: 'Killed',
    id: 'mutantId1',
    location: { start: { line: 10, column: 5 }, end: { line: 10, column: 10 } },
    mutatorName: 'exampleMutator1',
  },
  {
    fileName: 'exampleFile2.ts',
    replacement: 'anotherValue',
    status: 'Survived',
    id: 'mutantId2',
    location: { start: { line: 5, column: 3 }, end: { line: 5, column: 8 } },
    mutatorName: 'exampleMutator2',
  },
  {
    fileName: 'exampleFile3.ts',
    replacement: 'thirdValue',
    status: 'RuntimeError',
    id: 'mutantId3',
    location: { start: { line: 15, column: 8 }, end: { line: 15, column: 15 } },
    mutatorName: 'exampleMutator3',
  },
];

describe(MutationServer.name, () => {
  let transporterMock: TransporterMock;
  let loggerStub: sinon.SinonStubbedInstance<Logger>;
  let mutationServer: MutationServer;
  let serverCapabilities: ServerCapabilities;

  beforeEach(() => {
    transporterMock = new TransporterMock();
    loggerStub = sinon.createStubInstance(Logger);
    serverCapabilities = {
      instrumentationProvider: {
        partialResults: false,
      },
      mutationTestProvider: {
        partialResults: true,
      },
    };
    mutationServer = new MutationServer(transporterMock, loggerStub, serverCapabilities);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe(MutationServer.prototype.instrument.name, () => {
    it('should send instrument request and receive response', async () => {
      // Arrange
      const sendFake = () => {
        transporterMock.emit('message', JSON.stringify(createJSONRPCSuccessResponse(1, [])));
      };

      sinon.replace(transporterMock, 'send', sinon.fake(sendFake));

      const instrumentParams: InstrumentParams = { globPatterns: ['file1', 'file2'] };

      // Act
      const actualMutantResult = await mutationServer.instrument(instrumentParams);

      // Assert
      expect(actualMutantResult).to.deep.eq([]);
    });

    it('should throw and log error when response is not a valid JSON', async () => {
      // Arrange
      const sendFake = () => {
        transporterMock.emit('message', 'invalid JSON');
      };

      // Act
      sinon.replace(transporterMock, 'send', sinon.fake(sendFake));

      // Assert
      await expect(mutationServer.instrument({ globPatterns: ['file1', 'file2'] })).to.be.rejectedWith();
      expect(loggerStub.logError.calledOnce).to.be.true;
    });

    it('should throw error if instrumentation is not supported by the server', async () => {
      // Arrange
      const sut = new MutationServer(transporterMock, loggerStub, { instrumentationProvider: undefined });

      // Act & Assert
      await expect(sut.instrument({})).to.be.rejectedWith('Instrumentation is not supported by the server');
    });
  });

  describe(MutationServer.prototype.mutationTest.name, () => {
    it('should send mutation test request and receive partial result', async () => {
      // Arrange
      const sendFake = () => {
        transporterMock.emit(
          'message',
          JSON.stringify(
            createJSONRPCNotification('progress', {
              token: 1,
              value: {
                mutants: [mutants[0]],
              },
            }),
          ),
        );
        transporterMock.emit(
          'message',
          JSON.stringify(
            createJSONRPCNotification('progress', {
              token: 1,
              value: {
                mutants: [mutants[1], mutants[2]],
              },
            }),
          ),
        );
        transporterMock.emit('message', JSON.stringify(createJSONRPCSuccessResponse(1, [])));
      };

      sinon.replace(transporterMock, 'send', sinon.fake(sendFake));

      const receivedMutants: MutantResult[] = [];
      const onPartialResult = (partialResult: MutationTestPartialResult) => {
        receivedMutants.push(...partialResult.mutants);
      };

      const mutationTestParams: MutationTestParams = { globPatterns: ['file1', 'file2'], partialResultToken: 1 };

      // Act
      await mutationServer.mutationTest(mutationTestParams, onPartialResult);

      // Assert
      expect(receivedMutants.length).to.eq(3);
    });

    it('should throw error if mutation testing with partial results is not supported by the server', async () => {
      // Arrange
      const sut = new MutationServer(transporterMock, loggerStub, { mutationTestProvider: { partialResults: false } });

      // Act & Assert
      await expect(sut.mutationTest({}, () => undefined)).to.be.rejectedWith('Mutation tests with partial results are not supported by the server');
    });
  });

  describe(MutationServer.prototype.initialize.name, () => {
    it('should send initialize request', async () => {
      // Arrange
      const requestParams: InitializeParams = {
        clientInfo: { version: '0.0.1' },
        configUri: 'configUri',
      };

      const fake = sinon.fake(() => {
        transporterMock.emit('message', JSON.stringify(createJSONRPCSuccessResponse(1, [])));
      });
      sinon.replace(transporterMock, 'send', fake);

      // Act
      await mutationServer.initialize(requestParams);

      // Assert
      expect(fake.calledOnce).to.be.true;
    });
  });
});
