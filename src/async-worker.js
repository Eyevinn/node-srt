const {
  isMainThread, parentPort
} = require('worker_threads');

const debug = require('debug')('srt-async-worker');

const { SRT } = require('../build/Release/node_srt.node');

const { argsToString, traceCallToString, extractTransferListFromParams } = require('./async-helpers');

const DEBUG = false;
const DRY_RUN = false;

if (isMainThread) {
  throw new Error("Worker module can not load on main thread");
}

try {
  run()
} catch(err) {
  console.error('AsyncSRT task-runner internal exception:', err);
}

function run() {

  DEBUG && debug('AsyncSRT: Launching task-runner');

  const srtNapiObjw = new SRT();

  DEBUG && debug('AsyncSRT: SRT native object-wrap created');

  parentPort.on('close', () => {
    DEBUG && debug('AsyncSRT: Closing task-runner');
  })

  parentPort.on('message', (data) => {

    if (!data.method) {
      throw new Error('Worker message needs `method` property');
    }

    /*
    if (!data.workId) {
      throw new Error('Worker message needs `workId` property');
    }
    */

    if (data.args.some((arg) => arg === undefined)) {
      const err = new Error(
        `Ignoring call: Can't have any arguments be undefined: ${argsToString(data.args)}`);
      parentPort.postMessage(err);
      return;
    }

    DEBUG && debug('Received call:', traceCallToString(data.method, data.args));

    let result = 0;
    if (!DRY_RUN) {
      try {
        result = srtNapiObjw[data.method].apply(srtNapiObjw, data.args);
      } catch(err) {
        console.error(
          `Exception thrown by native binding call "${traceCallToString(data.method, data.args)}":`,
            err);
        parentPort.postMessage({err, call: data});
        return;
      }
    }

    const transferList = extractTransferListFromParams([result]);

    parentPort.postMessage({
      // workId: data.workId,
      timestamp: data.timestamp,
      result
    }, transferList);

  });
}
