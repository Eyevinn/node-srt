const {SRT} = require('../build/Release/node_srt.node');

let srt = null;

/**
 *
 * @param {number | SRTLoggingLevel} level
 */
function setSRTLoggingLevel(level) {
  if (!srt) {
    srt = new SRT();
  }
  srt.setLogLevel(level)
}

module.exports = {
  setSRTLoggingLevel
}
