"use strict";

const fs = require('fs');
const dest = fs.createWriteStream('./output');
const { SRTReadStream } = require('../index.js');

setInterval(() => {
  console.log("Hey, I am still alive!");
}, 2000);

if (process.argv[2] === "listener") {
  const srt = new SRTReadStream('0.0.0.0', 1234);
  srt.listen(readStream => {
    readStream.pipe(dest);
  });
  console.log("async listen");
} else {
  const srt = new SRTReadStream('127.0.0.1', 1234);
  srt.connect(readStream => {
    readStream.pipe(dest);
  });
}
