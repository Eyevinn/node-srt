const fs = require('fs');
const dest = fs.createWriteStream('./output');
const { SRTReadStream } = require('../index.js');

const srt = new SRTReadStream('0.0.0.0', 1234);
srt.listen(readStream => {
  readStream.pipe(dest);
});