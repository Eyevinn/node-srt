"use strict";

const { AsyncSRT } = require('../src/async.js');

const asyncSrt = new AsyncSRT();

(async function() {
  const socket = await asyncSrt.createSocket(false);
  console.log('createSocket() result:', socket);
  let result = await asyncSrt.bind(socket, "0.0.0.0", 1234);
  console.log('bind() result:', result);
  result = await asyncSrt.listen(socket, 2);
  console.log('listen() result:', result);

  awaitConnections(socket);

})();

async function awaitConnections(socket) {
  console.log('Awaiting incoming client connection ...');
  const fd = await asyncSrt.accept(socket);
  console.log('New incoming client fd:', fd);
}

setInterval(() => {
  console.log('Doing other stuff in the meantime ... :)');
}, 1000);
