const { SRT, AsyncSRT } = require('../index.js');

// Regression test for https://github.com/Eyevinn/node-srt/issues/79
//
// NodeSRT::Accept() used to call srt_close() on the listener socket on the
// success path, so the listener could only ever accept a single connection
// before going BROKEN. These tests accept several connections in a row from
// the same listener and assert it stays LISTENING throughout, for both the
// sync (SRT) and async (AsyncSRT) accept paths.

describe("Accept() must not close the listener socket", () => {
  const numConnections = 3;

  it("keeps a sync (SRT) listener open across multiple sequential accepts", async () => {
    const srt = new SRT();
    const listenerFd = srt.createSocket();
    srt.bind(listenerFd, "0.0.0.0", 1350);
    srt.listen(listenerFd, 8);

    // Drives the connecting side off the main thread so the blocking
    // srt.accept() call below can be unblocked by an in-flight connect.
    const asyncClient = new AsyncSRT();

    for (let i = 0; i < numConnections; i++) {
      const clientFd = await asyncClient.createSocket();
      const connectPromise = asyncClient.connect(clientFd, "127.0.0.1", 1350);

      const acceptedFd = srt.accept(listenerFd);

      expect(acceptedFd).not.toEqual(SRT.ERROR);
      expect(srt.getSockState(listenerFd)).toEqual(SRT.SRTS_LISTENING);

      await connectPromise;
      srt.close(acceptedFd);
      await asyncClient.close(clientFd);
    }

    srt.close(listenerFd);
    await asyncClient.dispose();
  });

  it("keeps an async (AsyncSRT) listener open across multiple sequential accepts", async () => {
    const asyncServer = new AsyncSRT();
    const asyncClient = new AsyncSRT();

    const listenerFd = await asyncServer.createSocket();
    await asyncServer.bind(listenerFd, "0.0.0.0", 1351);
    await asyncServer.listen(listenerFd, 8);

    for (let i = 0; i < numConnections; i++) {
      const clientFd = await asyncClient.createSocket();
      const connectPromise = asyncClient.connect(clientFd, "127.0.0.1", 1351);

      const acceptedFd = await asyncServer.accept(listenerFd);

      expect(acceptedFd).not.toEqual(SRT.ERROR);
      expect(await asyncServer.getSockState(listenerFd)).toEqual(SRT.SRTS_LISTENING);

      await connectPromise;
      await asyncServer.close(acceptedFd);
      await asyncClient.close(clientFd);
    }

    await asyncServer.close(listenerFd);
    await asyncServer.dispose();
    await asyncClient.dispose();
  });
});
