const {
  Worker, isMainThread, parentPort, workerData
} = require('worker_threads');

const path = require('path');
const {performance} = require("perf_hooks");

const DEFAULT_PROMISE_TIMEOUT_MS = 3000;

/*
const WORK_ID_GEN_MOD = 0xFFF;
*/

class AsyncSRT {

  /**
   * @static
   * @type {number} Promise-timeout in millis
   */
  static TimeoutMs = DEFAULT_PROMISE_TIMEOUT_MS;

  constructor() {
    this._worker = new Worker(path.resolve(__dirname, './async-worker.js'));
    this._worker.on('message', this._onWorkerMessage.bind(this));
    /*
    this._workIdGen = 0;
    this._workCbMap = new Map();
    */
    this._workCbQueue = [];
  }

  /**
   * @private
   * @param {*} data
   */
  _onWorkerMessage(data) {
    const resolveTime = performance.now();
    const {timestamp, result, workId} = data;

    const callback = this._workCbQueue.shift();
    callback(result);
  }

  /**
   * @private
   * @param {string} method
   * @param {Array<any>} args
   * @param {Function} callback
   */
  _postAsyncWork(method, args, callback) {
    const timestamp = performance.now();

    // not really needed atm,
    // only if the worker spawns async jobs itself internally
    // and thus the queuing order of jobs would not be preserved
    // across here and the worker side.
    /*
    if (this._workCbMap.size >= WORK_ID_GEN_MOD - 1) {
      throw new Error('Can`t post more async work: Too many awaited callbacks unanswered in queue');
    }
    const workId = this._workIdGen;
    this._workIdGen = (this._workIdGen + 1) % WORK_ID_GEN_MOD;
    this._workCbMap.set(workId, callback);
    */

    this._workCbQueue.push(callback);
    this._worker.postMessage({method, args, /*workId,*/ timestamp});
  }

  /**
   * @private
   * @param {string} method
   * @param {Array<any>} args optional
   * @param {Function} callback optional
   */
  _createAsyncWorkPromise(method, args = [], callback = null, useTimeout = true, timeoutMs = AsyncSRT.TimeoutMs) {
    return new Promise((resolve, reject) => {
      let timeout;
      let rejected = false;
      const onResult = (result) => {
        // Q: signal somehow to app that timed-out call has had result after all? (only in case of using Promise..?)
        if (rejected) {
          // The reject thing only makes sense for Promise,
          // and users can manage this aspect themselves when using plain callbacks.
          if (callback) callback(result);
          return;
        } else if (useTimeout) clearTimeout(timeout);
        resolve(result);
        if (callback) callback(result); // NOTE: the order doesn't matter for us,
        //      but intuitively the promise result should probably be resolved first.
      };
      if (useTimeout) {
        timeout = setTimeout(() => {
          reject(new Error('Timeout exceeded while awaiting result from worker running native-addon module functions'));
          rejected = true;
        }, timeoutMs);
      }
      this._postAsyncWork(method, args, onResult);
    });
  }

  /**
   *
   * @param {boolean} sender
   * @returns SRTSOCKET identifier (integer value) or -1 (SRT_ERROR)
   */
  createSocket(sender, callback) {
    return this._createAsyncWorkPromise("createSocket", [sender], callback);
  }

  /**
   *
   * @param socket
   * @param address
   * @param port
   */
  bind(socket, address, port, callback) {
    return this._createAsyncWorkPromise("bind", [socket, address, port], callback);
  }

  /**
   *
   * @param socket
   * @param backlog
   */
  listen(socket, backlog, callback) {
    return this._createAsyncWorkPromise("listen", [socket, backlog], callback);
  }

  /**
   *
   * @param socket
   * @param host
   * @param port
   */
  connect(socket, host, port, callback) {
    return this._createAsyncWorkPromise("connect", [socket, host, port], callback);
  }

  /**
   *
   * @param socket
   * @returns File descriptor of incoming connection pipe
   */
  accept(socket, callback, useTimeout = false, timeoutMs = AsyncSRT.TimeoutMs) {
    return this._createAsyncWorkPromise("accept", [socket], callback, useTimeout, timeoutMs);
  }

  /**
   *
   * @param socket
   */
  close(socket, callback) {
    return this._createAsyncWorkPromise("close", [socket], callback);
  }

  /**
   *
   * @param socket
   * @param chunkSize
   * @returns {Promise<Buffer>}
   */
  read(socket, chunkSize, callback) {
    return this._createAsyncWorkPromise("read", [socket, chunkSize], callback);
  }

  /**
   *
   * @param socket
   * @param {Buffer} chunk
   */
  write(socket, chunk, callback) {
    // TODO: see if we can do this using SharedArrayBuffer for example,
    //       or just leveraging Transferable objects capabilities ... ?
    // FIXME: Performance ... ?
    const buf = Buffer.allocUnsafe(chunk.length);
    chunk.copy(buf);
    chunk = buf;
    return this._createAsyncWorkPromise("write", [socket, chunk], callback);
  }

  /**
   *
   * @param socket
   * @param option
   * @param value
   */
  setSockOpt(socket, option, value, callback) {
    return this._createAsyncWorkPromise("setSockOpt", [socket, option, value], callback);
  }

  /**
   *
   * @param socket
   * @param option
   */
  getSockOpt(socket, option, callback) {
    return this._createAsyncWorkPromise("getSockOpt", [socket, option], callback);
  }

  /**
   *
   * @param socket
   */
  getSockState(socket, callback) {
    return this._createAsyncWorkPromise("getSockState", [socket], callback);
  }

  /**
   * @returns epid
   */
  epollCreate(callback) {
    return this._createAsyncWorkPromise("epollCreate", [], callback);
  }

  /**
   *
   * @param epid
   * @param socket
   * @param events
   */
  epollAddUsock(epid, socket, events, callback) {
    return this._createAsyncWorkPromise("epollAddUsock", [epid, socket, events], callback);
  }

  /**
   *
   * @param epid
   * @param msTimeOut
   */
  epollUWait(epid, msTimeOut, callback) {
    return this._createAsyncWorkPromise("epollUWait", [epid, msTimeOut], callback);
  }
}

module.exports = {AsyncSRT};






