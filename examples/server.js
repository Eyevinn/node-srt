"use strict";

const fs = require('fs');
const { SRTReadStream } = require('../index.js');

const dest = fs.createWriteStream('./output');
const srt = new SRTReadStream('0.0.0.0', 1234);
srt.listen(readStream => {
  console.log("Client connected");
  readStream.pipe(dest);
});
srt.on('end', () => {
  console.log("Client disconnected");
});

console.log("Waiting for client to connect");
