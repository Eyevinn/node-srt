function argsToString(args) {
  const list = args
    .map(argsItemToString).join(', ');
  return `[${list}]`;
}

function isBufferOrTypedArray(elem) {
  return elem.buffer
    && elem.buffer instanceof ArrayBuffer;
}

function argsItemToString(elem) {
  if (isBufferOrTypedArray(elem)) {
    return `${elem.constructor.name}<bytes=${elem.byteLength}>`
  } else {
    return elem;
  }
}

function traceCallToString(method, args) {
  return  `SRT.${method}(...${argsToString(args)});`
}

/**
 * @see https://nodejs.org/api/worker_threads.html#worker_threads_worker_threads
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Transferable
 * @param {any[]} args Used parameter list to extract Transferrables from
 * @returns {ArrayBuffer[]} List of transferrable objects owned by items of a parameter list
 */
function extractTransferListFromParams(args) {
  const transferList = args.reduce((accu, item, index) => {
    if (isBufferOrTypedArray(item)) {
      accu.push(item.buffer);
    }
    return accu;
  }, []);
  return transferList;
}

module.exports = {
  argsToString,
  traceCallToString,
  isBufferOrTypedArray,
  extractTransferListFromParams
};
