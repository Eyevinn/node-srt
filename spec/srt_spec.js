const { SRT } = require('../index.js');

describe("SRT library", () => {
  it("can create an SRT socket", () => {
    const srt = new SRT();
    const socket = srt.createSocket();
    expect(socket).not.toEqual(-1);
  });

  it("can create an SRT socket for sending data", () => {
    const srt = new SRT();
    const socket = srt.createSocket(true);
    expect(socket).not.toEqual(-1);
  })
});