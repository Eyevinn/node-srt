const fs = require('fs');
const { SRTWriteStream } = require('../index.js');

const source = fs.createReadStream(process.argv[2], { highWaterMark: 1316 });
const srt = new SRTWriteStream('127.0.0.1', 1234);
srt.connect(writeStream => {
  source.pipe(writeStream);
});
srt.on('error', err => {
  console.error(err.message);
})

process.on('SIGINT', () => {
  console.log("Closing connection");
  srt.close();
});