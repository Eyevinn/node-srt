const fs = require('fs');
const dest = fs.createWriteStream('/dev/null');
const { SRTReadStream } = require('../index.js');

describe("SRTReadStream", () => {
  it('can be constructed without throwing an exception', () => {
    new SRTReadStream();
  })
});
