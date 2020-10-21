const { SRT, AsyncSRT, SRTServer } = require('../index');
const {
  writeChunksWithYieldingLoop,
  writeChunksWithExplicitScheduling
} = require('../src/async-write-modes');

const {sliceBufferToChunks, copyChunksIntoBuffer} = require('../src/tools')

const fs = require("fs");
const path = require("path");
const {performance} = require("perf_hooks");

const now = performance.now;

const testFiles = [
  "data/SpringBlenderOpenMovie.mp4.ts"
]

jest && jest.setTimeout(5000)

describe("AsyncSRT to SRTServer one-way transmission", () => {
  it("should transmit data written (yielding-loop)", async done => {
    transmitClientToServerLoopback(9000, done, false);
  });

  it("should transmit data written (explicit-scheduling)", async done => {
    transmitClientToServerLoopback(9001, done, true);
  });
});

async function transmitClientToServerLoopback(localServerPort, done, useExplicitScheduling) {

  const fileReadStartTime = now();

  const sourceDataBuf = fs.readFileSync(path.resolve(__dirname, testFiles[0]))
  const fileReadTimeDiffMs = now() - fileReadStartTime;

  const localServerBindIface = '127.0.0.1';
  const chunkMaxSize = 1024;
  const numChunks = 8 * 1024;
  // type size NodeJS-internal readable grabs in binary streams
  const readBufSize = 1024 * 1024;
  const bytesShouldSendTotal
    = Math.min(numChunks * chunkMaxSize, sourceDataBuf.byteLength);

  const clientWritesPerTick = 128;

  console.log(`Read ${sourceDataBuf.byteLength} bytes from file into buffer in ${fileReadTimeDiffMs.toFixed(3)} ms`);

  const packetDataSlicingStartTime = now();
  const chunks = sliceBufferToChunks(sourceDataBuf, chunkMaxSize, bytesShouldSendTotal);
  const packetDataSlicingTimeD = now() - packetDataSlicingStartTime;
  console.log('Pre-slicing packet data took millis:', packetDataSlicingTimeD);

  // we need two instances of task-runners here,
  // because otherwise awaiting server accept
  // result would deadlock
  // client connection tasks
  const asyncSrtServer = new SRTServer(localServerPort);

  asyncSrtServer.on('connection', (connection) => {
    onClientConnected(connection);
  });

  const asyncSrtClient = new AsyncSRT();

  const [clientSideSocket] = await Promise.all([
    asyncSrtClient.createSocket(), // we could also use the server-runner here. doesnt matter.
    asyncSrtServer.create().then(s => s.open())
  ]);

  console.log('Got socket handles (client/server):',
    clientSideSocket, '/',
    asyncSrtServer.socket);

  clientWriteToConnection();

  let clientWriteStartTime;
  let clientWriteDoneTime;
  let bytesSentCount = 0;

  async function clientWriteToConnection() {

    let result = await asyncSrtClient.connect(clientSideSocket,
      localServerBindIface, localServerPort);

    if (result === SRT.ERROR) {
      throw new Error('client connect failed');
    }

    console.log('connect result:', result)

    clientWriteStartTime = now();

    if (useExplicitScheduling) {
      writeChunksWithExplicitScheduling(asyncSrtClient,
        clientSideSocket, chunks, onWrite, clientWritesPerTick);
    } else {
      writeChunksWithYieldingLoop(asyncSrtClient,
        clientSideSocket, chunks, onWrite, clientWritesPerTick);
    }

    function onWrite(byteLength) {
      bytesSentCount += byteLength;
      if(bytesSentCount >= bytesShouldSendTotal) {
        console.log('done writing, took millis:',
          now() - clientWriteStartTime);
        clientWriteDoneTime = now();
      }
    }
  }

  function onClientConnected(connection) {
    console.log('Got new connection:', connection.fd)

    let bytesRead = 0;
    let firstByteReadTime;

    const serverConnectionAcceptTime = now();

    connection.on('data', async () => {
      if (!connection.gotFirstData) {
        onClientData();
      }
    });

    const reader = connection.getReaderWriter();

    async function onClientData() {

      const chunks = await reader.readChunks(
        bytesShouldSendTotal,
        readBufSize,
        (readBuf) => {
        if (!firstByteReadTime) {
          firstByteReadTime = now();
        }
        //console.log('Read buffer of size:', readBuf.byteLength)
        bytesRead += readBuf.byteLength;
      }, (errRes) => {
        console.log('Error reading, got result:', errRes);
      });

      const readDoneTime = now();
      const readTimeDiffMs = readDoneTime - serverConnectionAcceptTime;
      const readBandwidthEstimKbps = (8 * (bytesShouldSendTotal / readTimeDiffMs))
      console.log('Done reading stream, took millis:', readTimeDiffMs, 'for kbytes:~',
      (bytesSentCount / 1000), 'of', (bytesShouldSendTotal / 1000));
      console.log('Estimated read-bandwidth (kb/s):', readBandwidthEstimKbps.toFixed(3))
      console.log('First-byte-write-to-read latency millis:',
        firstByteReadTime - clientWriteStartTime)
      console.log('End-to-end transfer latency millis:', readDoneTime - clientWriteStartTime)
      console.log('Client-side writing took millis:',
        clientWriteDoneTime - clientWriteStartTime);

      expect(bytesSentCount).toEqual(bytesShouldSendTotal);

      const receivedBuffer = copyChunksIntoBuffer(chunks);

      expect(receivedBuffer.byteLength).toEqual(bytesSentCount);

      /*

      for (let i = 0; i < receivedBuffer.byteLength; i++) {
        expect(sourceDataBuf.readInt8(i)).toEqual(receivedBuffer.readInt8(i));
      }

      */
      done();
    }

  }

}

