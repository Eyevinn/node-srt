const { SRT, AsyncSRT } = require('../index.js');

describe("Async SRT Library with async/await", () => {
  it("can create an SRT socket", async () => {
    const asyncSrt = new AsyncSRT();
    const socket = await asyncSrt.createSocket(false);

    expect(socket).not.toEqual(SRT.ERROR);
  });

  it("can create an SRT socket for sending data", async () => {
    const asyncSrt = new AsyncSRT();
    const socket = await asyncSrt.createSocket(true);

    expect(socket).not.toEqual(SRT.ERROR);
  });
});