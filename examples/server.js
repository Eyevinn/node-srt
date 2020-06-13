const { Server } = require('../index.js');

const srtServer = new Server();

srtServer.on("message", (msg, rinfo) => {

});
srtServer.on("listening", (address, port) => {
  console.log(`SRT server listening on ${address}:${port}`);
});
srtServer.listen({ port: 1234 });