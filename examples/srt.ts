import {SRT} from '../index';

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

console.log("Waiting for client to connect");
const fhandle = srt.accept(socket);

if (fhandle) {
  console.log("Client connected");
  const chunk = srt.read(fhandle, 1316);
  console.log("Read chunk: " + chunk.length);
}
