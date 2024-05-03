import EventEmitter from 'events';

import sinon from 'sinon';
import { expect } from 'chai';
import { createJSONRPCNotification, createJSONRPCSuccessResponse } from 'json-rpc-2.0';

import { MutationServer } from '../../../src/mutation-server/mutation-server';
import { Transporter } from '../../../src/mutation-server/transport/transporter';
import { Logger } from '../../../src/utils/logger';
import { InstrumentParams, MutateParams, MutatePartialResult } from '../../../src/mutation-server/mutation-server-protocol';
import { MutantResult } from '../../../src/api/mutant-result';

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

  beforeEach(() => {
    transporterMock = new TransporterMock();
    loggerStub = sinon.createStubInstance(Logger);
    mutationServer = new MutationServer(transporterMock, loggerStub);
  });

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

    sinon.replace(transporterMock, 'send', sinon.fake(sendFake));

    // Act
    try {
      const instrumentParams: InstrumentParams = { globPatterns: ['file1', 'file2'] };
      await mutationServer.instrument(instrumentParams);
    } catch (error) {
      // Assert
      expect(error).to.be.instanceOf(Error);
    }

    expect(loggerStub.logError.calledOnce).to.be.true;
  });

  it('should send mutate request and receive partial result', async () => {
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
    const onPartialResult = (partialResult: MutatePartialResult) => {
      receivedMutants.push(...partialResult.mutants);
    };

    const mutateParams: MutateParams = { globPatterns: ['file1', 'file2'], partialResultToken: 1 };

    // Act
    await mutationServer.mutate(mutateParams, onPartialResult);

    // Assert
    expect(receivedMutants.length).to.eq(3);
  });
});
