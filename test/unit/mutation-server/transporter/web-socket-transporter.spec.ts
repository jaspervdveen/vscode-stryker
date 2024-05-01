import { ChildProcessWithoutNullStreams } from 'node:child_process';

import { expect } from 'chai';
import sinon from 'sinon';
import WebSocket, { WebSocketServer } from 'ws';

import { WebSocketTransporter } from '../../../../src/mutation-server/transport/web-socket-transporter';

describe(WebSocketTransporter.name, () => {
  beforeEach(() => {});

  afterEach(() => {
    sinon.restore(); // Restores the default sandbox
  });

  describe(WebSocketTransporter.prototype.send.name, () => {
    it('should send message through WebSocket', () => {
      // Arrange
      const transporter = new WebSocketTransporter(8080);
      const message = 'Test Message';
      const fakeSend = sinon.fake();
      sinon.stub(WebSocket.prototype, 'send').callsFake(fakeSend);

      // Act
      transporter.send(message);

      // Assert
      expect(fakeSend.calledOnceWithExactly(message)).to.be.true;
    });
  });

  describe(WebSocketTransporter.create.name, () => {
    it('should get websocket port from server process', async () => {
      const webSocketServer = new WebSocketServer({ port: 0 }); // Random port
      const webSocketAddress = webSocketServer.address() as WebSocket.AddressInfo;
      const { port } = webSocketAddress;

      const mockProcess: ChildProcessWithoutNullStreams = {
        // Mock the stdout stream
        stdout: {
          on: sinon.stub().callsFake((event, cb) => {
            if (event === 'data') {
              // Simulate server output
              cb(Buffer.from(`Server is listening on port: ${port}`));
            }
          }),
        },
      } as unknown as ChildProcessWithoutNullStreams;

      // Act
      const transporter = await WebSocketTransporter.create(mockProcess);

      // Assert
      expect(transporter).to.be.instanceOf(WebSocketTransporter);

      webSocketServer.close();
    });

    it('should emit message event when message is received', async () => {
      const webSocketServer = new WebSocketServer({ port: 0 }); // Random port
      const webSocketAddress = webSocketServer.address() as WebSocket.AddressInfo;
      const { port } = webSocketAddress;

      const mockProcess: ChildProcessWithoutNullStreams = {
        // Mock the stdout stream
        stdout: {
          on: sinon.stub().callsFake((event, cb) => {
            if (event === 'data') {
              // Simulate server output
              cb(Buffer.from(`Server is listening on port: ${port}`));
            }
          }),
        },
      } as unknown as ChildProcessWithoutNullStreams;

      const transporter = await WebSocketTransporter.create(mockProcess);
      const spy = sinon.spy(transporter);
      webSocketServer.clients.forEach((client) => client.send('Test Message'));

      // Wait for websocket to handle message
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Assert that the message event is emitted
      expect(spy.emit.calledOnceWithExactly('message', 'Test Message')).to.be.true;
    });
  });
});
