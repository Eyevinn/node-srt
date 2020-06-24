const { SRT } = require('../index.js');

describe("SRT library", () => {
  it("exposes constants", () => {
    expect(SRT.ERROR).toEqual(-1);
    expect(SRT.INVALID_SOCK).toEqual(-1);
  });

  it("can create an SRT socket", () => {
    const srt = new SRT();
    const socket = srt.createSocket();
    expect(socket).not.toEqual(SRT.ERROR);
  });

  it("can create an SRT socket for sending data", () => {
    const srt = new SRT();
    const socket = srt.createSocket(true);
    expect(socket).not.toEqual(SRT.ERROR);
  });

  it("can set SRT sockopt SRTO_MSS", () => {
    const srt = new SRT();
    const socket = srt.createSocket();
    const result = srt.setSockOpt(socket, SRT.SRTO_MSS, 1052);
    expect(result).not.toEqual(SRT.ERROR);
    const value = srt.getSockOpt(socket, SRT.SRTO_MSS);
    expect(value).toEqual(1052);
  });
});