const fs = require('fs');
const dest = fs.createWriteStream('/dev/null');
const { SRTReadStream } = require('../index.js');
