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

  it("can get socket state", () => {
    const srt = new SRT();
    const socket = srt.createSocket();
    const state = srt.getSockState(socket);

    expect(state).toEqual(SRT.SRTS_INIT);
  });

  it("can set SRT sockopt SRTO_MSS", () => {
    const srt = new SRT();
    const socket = srt.createSocket();
    const result = srt.setSockOpt(socket, SRT.SRTO_MSS, 1052);

    expect(result).not.toEqual(SRT.ERROR);
    const value = srt.getSockOpt(socket, SRT.SRTO_MSS);

    expect(value).toEqual(1052);
  });

  it("can set SRT sockopt SRTO_STREAMID", () => {
    const srt = new SRT();
    const socket = srt.createSocket();
    const result = srt.setSockOpt(socket, SRT.SRTO_STREAMID, "STREAMID");

    expect(result).not.toEqual(SRT.ERROR);
    const value = srt.getSockOpt(socket, SRT.SRTO_STREAMID);

    expect(value).toEqual("STREAMID");
  });

  it("can set SRT socket in non-blocking mode", () => {
    const srt = new SRT();
    const socket = srt.createSocket();
    const result = srt.setSockOpt(socket, SRT.SRTO_RCVSYN, false);

    expect(result).not.toEqual(SRT.ERROR);
    const value = srt.getSockOpt(socket, SRT.SRTO_RCVSYN);

    expect(value).toEqual(false);
  });

  it("can setup non-blocking event poll", () => {
    const srt = new SRT();
    const socket = srt.createSocket();
    srt.setSockOpt(socket, SRT.SRTO_RCVSYN, false);
    srt.bind(socket, "0.0.0.0", 1234);
    srt.listen(socket, 10);
    const epid = srt.epollCreate();
    srt.epollAddUsock(epid, socket, SRT.EPOLL_IN | SRT.EPOLL_ERR);
    const events = srt.epollUWait(epid, 500);

    expect(events.length).toEqual(0);
  });

  it("exposes socket options", () => {
    expect(SRT.SRTO_UDP_SNDBUF).toEqual(8);
    expect(SRT.SRTO_RCVLATENCY).toEqual(43);
  });
});
