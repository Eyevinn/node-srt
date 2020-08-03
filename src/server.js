const { SRT } = require('../build/Release/node_srt.node');
const EventEmitter = require("events");
const debug = require('debug')('srt-server');

const libSRT = new SRT();

class SRTServer extends EventEmitter {
  constructor() {
    super();
    this.iface = null;
    this.port = null;
    this.socket = libSRT.createSocket();
  }

  listen({ address, port }) {
    const iface = address || "0.0.0.0";
    libSRT.bind(this.socket, iface, port);
    libSRT.listen(this.socket, 2);
    this.iface = address;
    this.port = port;
    this.emit("listening", iface, port);
    while (true) {
      const fhandle = libSRT.accept(this.socket);
      debug("Client connection accepted");
      this.emit("accepted", fhandle);
    }
  }
}

module.exports = SRTServer;
