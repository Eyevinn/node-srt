const LIB = require('./build/Release/node_srt.node');

const nsrt = new LIB.NodeSRT();
console.log(nsrt.hello());

module.exports = LIB;