"use strict";

const { SRT } = require('../index.js');

const srt = new SRT();
const socket = srt.createSocket();
if (socket !== -1) {
  console.log("Created socket: " + socket);
}

let result;

result = srt.bind(socket, "0.0.0.0", 1234);
if (!result) {
  console.log("Bind success");
} else {
  console.log(result);
}

result = srt.listen(socket, 10);
if (!result) {
  console.log("Listen success");
} else {
  console.log(result);
}

const epid = srt.epollCreate();
srt.epollAddUsock(epid, socket, SRT.EPOLL_IN | SRT.EPOLL_ERR);


while (true) {
  console.log("Waiting for action");
  const events = srt.epollUWait(epid, 1000);
  events.forEach(event => {
    const status = srt.getSockState(event.socket);
    if (status === SRT.SRTS_BROKEN || status === SRT.SRTS_NONEXIST || status === SRT.SRTS_CLOSED) {
      console.log("Client disconnected");
      srt.close(event.socket);
    } else if (event.socket === socket) {
      const fhandle = srt.accept(socket);
      console.log("New connection");
      srt.epollAddUsock(epid, fhandle, SRT.EPOLL_IN | SRT.EPOLL_ERR);
    } else {
      while (true) {
        const chunk = srt.read(event.socket, 1316);
        console.log("Read chunk: " + chunk.length);
      }
    }
  });
}
