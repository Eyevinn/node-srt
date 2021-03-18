const { Writable } = require('stream');
const { SRT } = require('../build/Release/node_srt.node');
const debug = require('debug')('srt-write-stream');

class SRTWriteStream extends Writable {
  constructor(address, port, opts) {
    super();
    this.srt = new SRT();
    this.socket = this.srt.createSocket();
    this.address = address;
    this.port = port;
  }

  connect(cb) {
    this.srt.connect(this.socket, this.address, this.port);
    this.fd = this.socket;
    if (this.fd) {
      cb(this);
    }
  }

  close() {
    this.srt.close(this.socket);
    this.fd = null;
  }

  stats(clear) {
    if (this.fd === null) {
      throw new Error('stats() called but stream was not initialized');
    }

    return this.srt.Stats(this.fd, clear);
  }

  _write(chunk, encoding, callback) {
    debug(`Writing chunk ${chunk.length}`);
    if (this.fd) {
      this.srt.write(this.fd, chunk);
      callback();
    } else {
      callback(new Error("Socket was closed"));
    }
  }

  _destroy(err, callback) {
    this.close();
  }
}

module.exports = {
  SRTWriteStream
};
