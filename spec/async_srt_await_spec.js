const { SRT, AsyncSRT } = require('../index.js');

describe("Async SRT API with async/await", () => {
  it("can create an SRT socket", async () => {
    const asyncSrt = new AsyncSRT();
    const socket = await asyncSrt.createSocket(false);

    expect(socket).not.toEqual(SRT.ERROR);

    //return await asyncSrt.dispose();
  });

  it("can create an SRT socket for sending data", async () => {
    const asyncSrt = new AsyncSRT();
    const socket = await asyncSrt.createSocket(true);

    expect(socket).not.toEqual(SRT.ERROR);

    //return await asyncSrt.dispose();
  });
});
