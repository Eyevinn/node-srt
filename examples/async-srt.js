"use strict";

const { AsyncSRT } = require('../src/async.js');

const asyncSrt = new AsyncSRT();

asyncSrt.createSocket(false, (result) => {
  console.log('createSocket:', result);
  const socket = result;
  asyncSrt.bind(socket, "0.0.0.0", 1234, (result) => {
    if (result !== 0) {
      console.log('Failed bind');
    } else {
      console.log('Bind success');
      asyncSrt.listen(socket, 2, (result) => {
        if (!result) {
          console.log("Listen success");
        } else {
          console.log(result);
        }
      });
    }
  });
});

