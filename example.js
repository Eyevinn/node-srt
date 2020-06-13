const { SRT } = require('./index.js');

const srt = new SRT();
const socket = srt.createSocket();

console.log(socket);