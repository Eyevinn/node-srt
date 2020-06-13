const LIB = require('./build/Release/node_srt.node');
const Server = require('./src/server.js');

module.exports = {
  SRT: LIB.SRT,
  Server: Server
}