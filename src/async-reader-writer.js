const EventEmitter = require("events");

const {
  writeChunksWithYieldingLoop
} = require('../src/async-write-modes');

const {
  READ_BUF_SIZE,
  readChunks
} = require('../src/async-read-modes');

const DEFAULT_MTU_SIZE = 1316; // (for writes) should be the maximum on all IP networks cases
const DEFAULT_WRITES_PER_TICK = 128; // tbi
const DEFAULT_READ_BUFFER = READ_BUF_SIZE; // typical stream buffer size read in Node-JS internals

class AsyncReaderWriter {

  constructor(asyncSrt, socketFd) {
    this._asyncSrt = asyncSrt;
    this._fd = socketFd;
  }

  /**
   *
   * @param {Uint8Array | Buffer} buffer
   * @param {number} writesPerTick
   * @param {number} mtuSize
   * @param {Function} onWrite
   * @returns {Promise<void>}
   */
  async writeChunks(buffer,
    writesPerTick = DEFAULT_WRITES_PER_TICK,
    mtuSize = DEFAULT_MTU_SIZE,
    onWrite = null) {

    const chunks = sliceBufferToChunks(buffer, mtuSize,
      buffer.byteLength, 0);

    return writeChunksWithYieldingLoop(this._asyncSrt, this._fd, chunks,
      onWrite, writesPerTick);
  }

  /**
   * Will read at least a number of bytes from SRT socket in async loop.
   *
   * Returns Promise on array of buffers.
   *
   * The amount read (sum of bytes of array of buffers returned)
   * may differ (exceed min bytes) by less than one MTU size.
   *
   * @param {number} minBytesRead
   * @param {Function} onRead
   * @param {Function} onError
   * @param {number} readBufSize
   * @returns {Promise<Uint8Array[]>}
   */
  async readChunks(minBytesRead = DEFAULT_MTU_SIZE,
    readBufSize = DEFAULT_READ_BUFFER,
    onRead = null,
    onError = null) {
    return readChunks(this._asyncSrt, this._fd, minBytesRead, readBufSize, onRead, onError)
  }
}

module.exports = {
  AsyncReaderWriter,
  DEFAULT_MTU_SIZE,
  DEFAULT_WRITES_PER_TICK,
  DEFAULT_READ_BUFFER
}
