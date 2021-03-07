const { Readable } = require('stream');
const { SRT } = require('../build/Release/node_srt.node');
const debug = require('debug')('srt-read-stream');

const CONNECTION_ACCEPT_POLLING_INTERVAL_MS = 50;
const READ_WAIT_INTERVAL_MS = 50;

const EPOLLUWAIT_TIMEOUT_MS = 1000;
const SOCKET_LISTEN_BACKLOG = 10;

/**
 * Example:
 *
 * const dest = fs.createWritableStream('./output');
 *
 * const srt = new SRTReadStream('0.0.0.0', 1234);
 * srt.listen(readStream => {
 *   readStream.pipe(dest);
 * })
 *
 */
class SRTReadStream extends Readable {
  // Q: opts not used ?
  // Q: not better if port (mandatory) is before, and address is optional (default to "0.0.0.0")?
  constructor(address, port, opts) {
    super();

    /**
     * @member {SRT}
     */
    this.srt = new SRT();

    /**
     * @member {number}
     */
    this.socket = this.srt.createSocket();

    /**
     * @member {string}
     */
    this.address = address;

    /**
     * @member {number}
     */
    this.port = port;

    /**
     * @member {number | null}
     */
    this.fd = null;

    this._eventPollInterval = null;
    this._readTimer = null;
  }

  /**
   *
   * @param {Function} onData Passes this stream instance as first arg to callback
   */
  listen(onData) {

    if (this.fd !== null) {
      throw new Error('listen() called but stream file-descriptor already initialized');
    }

    this.srt.bind(this.socket, this.address, this.port);
    this.srt.listen(this.socket, SOCKET_LISTEN_BACKLOG);

    const epid = this.srt.epollCreate();
    this.srt.epollAddUsock(epid, this.socket, SRT.EPOLL_IN | SRT.EPOLL_ERR);

    const interval = this._eventPollInterval = setInterval(() => {
      const events = this.srt.epollUWait(epid, EPOLLUWAIT_TIMEOUT_MS);
      events.forEach(event => {
        const status = this.srt.getSockState(event.socket);
        if (status === SRT.SRTS_BROKEN || status === SRT.SRTS_NONEXIST || status === SRT.SRTS_CLOSED) {
          debug("Client disconnected with socket:", event.socket);
          this.srt.close(event.socket);
          this.push(null);
          this.emit('end');
        } else if (event.socket === this.socket) {
          const fhandle = this.srt.accept(this.socket);
          debug("Accepted client connection with file-descriptor:", fhandle);
          this.srt.epollAddUsock(epid, fhandle, SRT.EPOLL_IN | SRT.EPOLL_ERR);
          this.emit('readable');
        } else {
          debug("Got data from connection on fd:", event.socket);
          this.fd = event.socket;
          clearInterval(interval);
          onData(this);
          this.emit('readable');
        }
      });
    }, CONNECTION_ACCEPT_POLLING_INTERVAL_MS);
  }

  /**
   *
   * @param {Function} onConnect
   */
  connect(onConnect) {

    if (this.fd !== null) {
      throw new Error('connect() called but stream file-descriptor already initialized');
    }

    this.srt.connect(this.socket, this.address, this.port);
    this.fd = this.socket;
    if (this.fd) {
      onConnect(this);
    }
  }

  close() {
    this.destroy();
  }

  stats(clear) {
    if (this.fd === null) {
      throw new Error('stats() called but stream was not initialized');
    }

    return this.srt.stats(this.fd, clear);
  }

  _scheduleNextRead(requestedBytes, timeoutMs) {
    this._readTimer = setTimeout(this._readSocketAndPush.bind(this, requestedBytes), timeoutMs);
  }

  _clearScheduledRead() {
    clearTimeout(this._readTimer);
    this._readTimer = null;
  }

  _readSocketAndPush(bytes) {
    this._clearScheduledRead();
    if (this.fd === null) {
      this._scheduleNextRead(bytes, READ_WAIT_INTERVAL_MS);
      return;
    }
    let remainingBytes = bytes;
    while(true) {
      const buffer = this.srt.read(this.fd, bytes);
      if (buffer === null) { // connection likely died
        debug("Socket read call returned 'null'");
        this.close();
        break;
      }
      // we expect a Buffer object here, but
      // -1 is the SRT_ERROR value that would get returned
      // if there is no data to read yet/anymore
      if (buffer === -1) {
        this._scheduleNextRead(remainingBytes, READ_WAIT_INTERVAL_MS);
        break;
      }
      //debug(`Read ${buffer.length} bytes from fd`);

      // @see https://nodejs.org/api/stream.html#stream_readable_push_chunk_encoding
      if (this.push(buffer)) {
        remainingBytes -= buffer.length;
        if (remainingBytes <= 0) {
          // 0 as a timer value acts as setImmediate task (next tick ideally)
          break;
        }
      } else {
        debug("Readable.push returned 'false' at remaining bytes:", remainingBytes);
        break;
      }
    }
  }

  /**
   * @see https://nodejs.org/api/stream.html#stream_readable_read_size_1
   * @param {number} bytes
   */
  _read(bytes) {
    debug('Readable._read(): requested bytes:', bytes);
    this._readSocketAndPush(bytes);
  }

  /**
   * @see https://nodejs.org/api/stream.html#stream_readable_destroy_err_callback
   * @param {Error} err
   * @param {Function} cb
   */
  _destroy(err, cb) {
    // guard from closing multiple times
    if (this.fd === null) return;
    this.srt.close(this.socket);
    this.fd = null;
    this._clearScheduledRead();
    if (cb) cb(err);
  }
}

module.exports = {
  SRTReadStream
};
