const fs = require('fs');
const source = fs.createReadStream(process.argv[2], { highWaterMark: 1316 });
const { SRTWriteStream } = require('../index.js');

const srt = new SRTWriteStream('127.0.0.1', 1234);
srt.connect(writeStream => {
  source.pipe(writeStream);
});