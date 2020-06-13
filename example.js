const { SRT } = require('./index.js');

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

result = srt.listen(socket, 2);
if (!result) {
  console.log("Listen success");
} else {
  console.log(result);
}
