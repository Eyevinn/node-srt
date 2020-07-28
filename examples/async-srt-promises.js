"use strict";

const { AsyncSRT } = require('../src/async.js');

const asyncSrt = new AsyncSRT();

let mySocket;

asyncSrt.createSocket(false)
  .catch((err) => console.error(err))
  .then((result) => {
    console.log('createSocket:', result);
    mySocket = result;
    return result;
  })
  .then((socket) => asyncSrt.bind(socket, "0.0.0.0", 1234))
  .then((result) => {
    if (result !== 0) {
      throw new Error('Failed bind');
    }
    console.log('Bind success');
    return asyncSrt.listen(mySocket, 2);
  })
  .then((result) => {
    if (!result) {
      console.log("Listen success");
    } else {
      throw new Error('SRT listen error: ' + result);
    }
  });


