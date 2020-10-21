const { AsyncSRT } = require('./async');
const { AsyncReaderWriter } = require('./async-reader-writer');
const { SRT } = require('../build/Release/node_srt.node');

const EventEmitter = require("events");
const debug = require('debug')('srt-server');

const DEBUG = false;

const EPOLL_PERIOD_MS_DEFAULT = 0;

const EPOLLUWAIT_TIMEOUT_MS = 0;

const SOCKET_LISTEN_BACKLOG = 128;

/**
 * @emits data
 * @emits closing
 * @emits closed
 */
class SRTConnection extends EventEmitter {
  /**
   *
   * @param {AsyncSRT} asyncSrt
   * @param {number} fd
   */
  constructor(asyncSrt, fd) {
    super();

    this._asyncSrt = asyncSrt;
    this._fd = fd;
    this._gotFirstData = false;
  }

  /**
   * @returns {number}
   */
  get fd() {
    return this._fd;
  }

  /**
   * Will be false until *after* emit of first `data` event.
   * After that will be true.
   */
  get gotFirstData() {
    return this._gotFirstData;
  }

  /**
   * @returns {AsyncReaderWriter}
   */
  getReaderWriter() {
    return new AsyncReaderWriter(this._asyncSrt, this.fd);
  }

  /**
   *
   * @param {number} bytes
   * @returns {Promise<Buffer | SRTResult.SRT_ERROR | null>}
   */
  async read(bytes) {
    return await this._asyncSrt.read(this.fd, bytes);
  }

  /**
   *
   * Pass a packet buffer to write to the connection.
   *
   * The size of the buffer must not exceed the SRT payload MTU
   * (usually 1316 bytes).
   *
   * Otherwise the call will resolve to SRT_ERROR.
   *
   * A system-specific socket-message error message may show in logs as enabled
   * where the error is thrown (on the binding call to the native SRT API),
   * and in the async API internals as it gets propagated back from the task-runner).
   *
   * Note that any underlying data buffer passed in
   * will be *neutered* by our worker thread and
   * therefore become unusable (i.e go to detached state, `byteLengh === 0`)
   * for the calling thread of this method.
   * When consuming from a larger piece of data,
   * chunks written will need to be slice copies of the source buffer.
   *
   * @param {Buffer | Uint8Array} chunk
   */
  async write(chunk) {
    return await this._asyncSrt.write(this.fd, chunk);
  }

  /**
   * @returns {Promise<SRTResult | null>}
   */
  async close() {
    if (this.isClosed()) return null;
    const asyncSrt = this._asyncSrt;
    this._asyncSrt = null;
    this.emit('closing');
    const result = await asyncSrt.close(this.fd);
    this.emit('closed', result);
    this.off();
    return result;
  }

  isClosed() {
    return ! this._asyncSrt;
  }

  onData() {
    this.emit('data');
    if (!this.gotFirstData) {
      this._gotFirstData = true;
    }
  }
}

/**
 * @emits created
 * @emits opened
 * @emits connection
 * @emits disconnection
 * @emits disposed
 */
class SRTServer extends EventEmitter {

  /**
   *
   * @param {number} port socket port number
   * @param {string} address optional, default: '0.0.0.0'
   * @param {number} epollPeriodMs optional, default: EPOLL_PERIOD_MS_DEFAULT
   * @returns {Promise<SRTServer>}
   */
  static create(port, address, epollPeriodMs) {
    return new SRTServer(port, address, epollPeriodMs).create();
  }

  /**
   *
   * @param {number} port socket port number
   * @param {string} address optional, default: '0.0.0.0'
   * @param {number} epollPeriodMs optional, default: EPOLL_PERIOD_MS_DEFAULT
   */
  constructor(port, address = '0.0.0.0', epollPeriodMs = EPOLL_PERIOD_MS_DEFAULT) {
    super();

    if (!Number.isInteger(port) || port <= 0 || port > 65535)
      throw new Error('Need a valid port number but got: ' + port);

    this.port = port;
    this.address = address;
    this.epollPeriodMs = epollPeriodMs;
    this.socket = null;
    this.epid = null;

    this._pollEventsTimer = null;
    this._asyncSrt = new AsyncSRT();
    this._connectionMap = {};
  }

  async dispose() {
    clearTimeout(this._pollEventsTimer);
    await this._asyncSrt.close(this.socket);
    this.socket = null;
    const res = await this._asyncSrt.dispose();
    this._asyncSrt = null;
    this.emit('disposed');
    return res;
  }

  /**
   * Call this before `open`.
   * Call `setSocketFlags` after this.
   *
   * @return {Promise<SRTServer>}
   */
  async create() {
    this.socket = await this._asyncSrt.createSocket();
    this.emit('created');
    return this;
  }

  /**
   * Call this after `create`.
   * Call `setSocketFlags` before calling this.
   *
   * @return {Promise<SRTServer>}
   */
  async open() {
    let result;
    result = await this._asyncSrt.bind(this.socket, this.address, this.port);
    if (result === SRT.ERROR) {
      throw new Error('SRT.bind() failed');
    }
    result = await this._asyncSrt.listen(this.socket, SOCKET_LISTEN_BACKLOG);
    if (result === SRT.ERROR) {
      throw new Error('SRT.listen() failed');
    }
    result = await this._asyncSrt.epollCreate();
    if (result === SRT.ERROR) {
      throw new Error('SRT.epollCreate() failed');
    }
    this.epid = result;

    this.emit('opened');

    // we should await the epoll subscribe result before continuing
    // since it is useless to poll events otherwise
    // and we should also yield from the stack at this point
    // since the `opened` event handlers above may do whatever
    await this._asyncSrt.epollAddUsock(this.epid, this.socket, SRT.EPOLL_IN | SRT.EPOLL_ERR);

    this._pollEvents();

    return this;
  }

  /**
   *
   * @param {SRTSockOpt[]} opts
   * @param {SRTSockOptValue[]} values
   * @returns {Promise<SRTResult[]>}
   */
  async setSocketFlags(opts, values) {
    if (opts.length !== values.length)
      throw new Error('opts and values must have same length');
    const promises = [];
    opts.forEach((opt, index) => {
      const p = this._asyncSrt.setSockOpt(this.socket, opt, values[index]);
      promises.push(p);
    })
    return Promise.all(promises);
  }

  /**
   *
   * @param {number} fd
   * @returns {SRTConnection | null}
   */
  getConnectionByHandle(fd) {
    return this._connectionMap[fd] || null;
  }

  /**
   * @returns {Array<SRTConnection>}
   */
  getAllConnections() {
    return Array.from(Object.values(this._connectionMap));
  }

  /**
   * @private
   * @param {SRTEpollEvent} event
   */
  async _handleEvent(event) {
    const status = await this._asyncSrt.getSockState(event.socket);

    // our local listener socket
    if (event.socket === this.socket) {

      if (status === SRT.SRTS_LISTENING) {
        const fd = await this._asyncSrt.accept(this.socket);
        // no need to await the epoll subscribe result before continuing
        this._asyncSrt.epollAddUsock(this.epid, fd, SRT.EPOLL_IN | SRT.EPOLL_ERR);
        debug("Accepted client connection with file-descriptor:", fd);
        // create new client connection handle
        // and emit accept event
        const connection = new SRTConnection(this._asyncSrt, fd);
        connection.on('closing', () => {
          // remove handle
          delete this._connectionMap[fd];
        });
        this._connectionMap[fd] = connection;
        this.emit('connection', connection);
      }

    // a client socket / fd
    // check if broken or closed
    } else if (status === SRT.SRTS_BROKEN
      || status === SRT.SRTS_NONEXIST
      || status === SRT.SRTS_CLOSED) {
      const fd = event.socket;
      debug("Client disconnected on fd:", fd);
      if (this._connectionMap[fd]) {
        await this._connectionMap[fd].close();
        this.emit('disconnection', fd);
      }
    // not broken, just new data
    } else {
      const fd = event.socket;
      DEBUG && debug("Got data from connection on fd:", fd);
      const connection = this.getConnectionByHandle(fd);
      if (!connection) {
        console.warn("Got event for fd not in connections map:", fd);
        return;
      }
      connection.onData();
    }
  }

  /**
   * @private
   */
  async _pollEvents() {
    const events = await this._asyncSrt.epollUWait(this.epid, EPOLLUWAIT_TIMEOUT_MS);
    events.forEach((event) => {
      this._handleEvent(event);
    });

    // clearing in case we get called multiple times
    // when already timer scheduled
    // will be no-op if timer-id invalid or old
    clearTimeout(this._pollEventsTimer);
    this._pollEventsTimer
      = setTimeout(this._pollEvents.bind(this), this.epollPeriodMs)
  }
}

module.exports = {
  SRTConnection,
  SRTServer
};
