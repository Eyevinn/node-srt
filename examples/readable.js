const fs = require('fs');
const dest = fs.createWriteStream('./output');
const { SRTReadStream } = require('../index.js');

if (process.argv[2] === "listener") {
  const srt = new SRTReadStream('0.0.0.0', 1234);
  srt.listen(readStream => {
    readStream.pipe(dest);
  });
} else {
  const srt = new SRTReadStream('127.0.0.1', 1234);
  srt.connect(readStream => {
    readStream.pipe(dest);
  });
}