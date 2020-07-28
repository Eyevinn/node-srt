const {
  Worker, isMainThread, parentPort, workerData
} = require('worker_threads');

const { SRT } = require('../build/Release/node_srt.node');

if (isMainThread) {
  throw new Error("Worker module can not load on main thread");
}

(function run() {
  const libSRT = new SRT();
  parentPort.on('message', (data) => {
    if (!data.method) {
      throw new Error('Worker message needs `method` property');
    }
    /*
    if (!data.workId) {
      throw new Error('Worker message needs `workId` property');
    }
    */
    let result = libSRT[data.method].apply(libSRT, data.args);
    // TODO: see if we can do this using SharedArrayBuffer for example,
    //       or just leveraging Transferable objects capabilities ... ?
    // FIXME: Performance ... ?
    if (result instanceof Buffer) {
      const buf = Buffer.allocUnsafe(result.length);
      result.copy(buf);
      result = buf;
    }
    parentPort.postMessage({
      // workId: data.workId,
      timestamp: data.timestamp,
      result
    });
  });
})();




