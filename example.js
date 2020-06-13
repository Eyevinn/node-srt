const SRT = require('./index.js').SRT;

const srt = new SRT();
const socket = srt.createSocket();

console.log(socket);