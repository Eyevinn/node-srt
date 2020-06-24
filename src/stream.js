const { Readable, Writable } = require('stream');
const LIB = require('../build/Release/node_srt.node');
const debug = require('debug')('srt-stream');

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
  constructor(address, port, opts) {
    super();
    this.srt = new LIB.SRT();
    this.socket = this.srt.createSocket();
    this.address = address;
    this.port = port;
  }

  listen(cb) {
    this.srt.bind(this.socket, this.address, this.port);
    this.srt.listen(this.socket, 10);

    const epid = this.srt.epollCreate();
    this.srt.epollAddUsock(epid, this.socket, LIB.SRT.EPOLL_IN | LIB.SRT.EPOLL_ERR);
    
    let t = setInterval(() => {
      const events = this.srt.epollUWait(epid, 1000);
      events.forEach(event => {
        const status = this.srt.getSockState(event.socket);
        if (status === LIB.SRT.SRTS_BROKEN || status === LIB.SRT.SRTS_NONEXIST || status === LIB.SRT.SRTS_CLOSED) {
          debug("Client disconnected");
          this.srt.close(event.socket);
        } else if (event.socket === this.socket) {
          const fhandle = this.srt.accept(this.socket);
          debug("New connection");
          this.srt.epollAddUsock(epid, fhandle, LIB.SRT.EPOLL_IN | LIB.SRT.EPOLL_ERR);
        } else {
          debug("Data from client");
          this.fd = event.socket;
          clearInterval(t);
          cb(this);
        }
      });
    }, 500);
  }

  connect(cb) {
    this.srt.connect(this.socket, this.address, this.port);
    this.fd = this.socket;
    if (this.fd) {
      cb(this);
    }
  }

  _read(size) {
    let chunk;
    try {  
      chunk = this.srt.read(this.fd, size);
      debug(`Read chunk ${chunk.length}`);
      while (!this.push(chunk)) {
        debug(`Read chunk ${chunk.length}`);
        chunk = this.srt.read(this.fd, size);
      }
    } catch (exc) {
      debug(exc.message);
      this.push(null);
    }
  }
}

class SRTWriteStream extends Writable {
  constructor(address, port, opts) {
    super();
    this.srt = new LIB.SRT();
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

  _write(chunk, encoding, callback) {
    this.srt.write(this.fd, chunk);
    callback();
  }
}

module.exports = {
  SRTReadStream,
  SRTWriteStream
}