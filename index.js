const LIB = require('./build/Release/node_srt.node');
const Server = require('./src/server.js');
const { SRTReadStream } = require('./src/stream.js');

module.exports = {
  SRT: LIB.SRT,
  Server: Server,
  SRTReadStream
}