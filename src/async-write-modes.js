const { SRT } = require('../build/Release/node_srt.node');

/**
 * @module async-write-modes
 *
 * @author Stephan Hesse <stephan@emliri.com>
 * @copyright EMLIRI, Stephan Hesse (c) 2020
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
 *
 */

/**
 *
 * @function
 *
 * Description:
 *
 * This function allows to dispatch in high-performing mode a number
 * of sequential `write()` calls to an `AsyncSRT` instance for a given `socketFd`.
 *
 * Specifications:
 *
 * - It allows for burst-writes to achieve throughput peaks as necessary in latency-critical
 * applications.
 *
 * - The function is passed an array of data-buffer slices
 * (that need to be individually "neuterable" or referencing a shared memory,
 * see `SharedArrayBuffer` in JavaScript language documentations),
 * which may be referred to packets.
 *
 * - The chunks size can not exceed the system or network
 * specific MTU which the underlying SRT write binding will be able to accept.
 *
 * - It operates fully non-blocking. The main-thread is only used for queuing write-calls,
 * and the maximum occupation time per iteration for queuing calls is parameterizable
 * (see `writesPerTick`). If you figure that main-thread slots are too long when calling this
 * function, consider adapting that parameter (which will cause scheduling overhead however
 * to how this function runs).
 *
 * - When using `ArrayBuffer`, i.e not using `SharedArrayBuffer` as a memory implementation:
 * It expects an array of buffers (chunks), which are referencing independent non
 * overlapping memory buffers, which is critical here as there will be no copy performed,
 * but each underlying buffer that is passed to the write-method will get neutered
 * by the worker-thread it is passed to.
 *
 * Performance:
 *
 * This note below is here mainly to explain how
 * this mode could potentially result in a different runtime-internal execution
 * (and performance) then another implementation, the "explict scheduling" one.
 *
 * What we call a "Yielding Loop" will attempt to use any task-slot available by the runtime
 * for queing writes (i.e transferring payload ownership to a worker),
 * while ensuring a limited number of calls per main-loop (that is corresponding to how the tick()
 * function here is invoked).
 *
 * By it's usage of the async/await paradigm, it causes the runtime
 * to internally use generators as promise-executor and implicitely involves a `yield`.
 *
 * "yielding" means, stepping in and out of the async function context
 * at a given point while maintaining context, while stepping back
 * in "asap" when the awaited promise gets resolved - here inside the while loop.
 * In order to allow for that context preservation and stack resumage (via async/await),
 * this will result in so-called generator-functions internally
 * with the JavaScript runtime. Now, depending how all that is implemented,
 * there can be an overhead to doing that, in comparison with different,
 * more hands-on "explicit" approaches to scheduling write calls,
 * that are not using generators.
 *
 * @param {AsyncSRT} asyncSrt
 * @param {number} socketFd
 * @param {Array<Uint8Array>} chunks
 * @param {Function} onWrite
 * @param {number} writesPerTick
 * @returns {Promise<void>}
 *
 */
async function writeChunksWithYieldingLoop(asyncSrt, socketFd, chunks,
  onWrite = null, writesPerTick = 1) {

  let chunkIndex = 0;
  let chunkWrittenIdx = 0;
  while(chunkIndex < chunks.length) await tick();

  function tick() {
    const writeResultPromises = [];
    for (let i = 0; i < writesPerTick; i++) {
      if(chunkIndex >= chunks.length) {
        break;
      }

      const chunkBuf = chunks[chunkIndex++];
      const whenWritten = asyncSrt.write(socketFd, chunkBuf);
      writeResultPromises.push(whenWritten);
      whenWritten.then((writeRes) => {
        if (writeRes === SRT.ERROR) {
          throw new Error('AsyncSRT.write() failed');
        }
        if (onWrite) {
          onWrite(writeRes, chunkWrittenIdx);
        }
        chunkWrittenIdx++
      });

    }
    return Promise.all(writeResultPromises);
  }
}

/**
 *
 * This is (almost) isofunctional to the yielding-loop (when intervalMs = 0),
 * but implemented without using the runtimes generator-function support. Instead,
 * we explicitely schedule all write calls using plain-old main-loop timers.
 * When we do that setting "immediate tasks" by using a zero-timeout value,
 * it will result in the exact same behavior from the perspective of the runtime,
 * to use any available slot potentially (as the "yielding loop" mode).
 *
 * However the yielding-loop "awaits" until all writes that had been
 * dispatched are resolved, while here we just keep pressuring the event queue.
 *
 * TODO: Implement rescheduling based on write-resolution (optional).
 *
 * The clear advantage of this is the explict nature of scheduling,
 * allow pace of calls to be throttled by the set interval value.
 * This can be very useful when we can afford to write data not asap,
 * but in a given minimal rate instead of bursts and avoid peaking CPU with that.
 *
 * When using zero as interval timeout, in principle this should perform
 * almost exactly like the generator-based mode (using any available
 * slot for running a tick()).
 *
 * But the explicit scheduling has in theory also the advantage to have
 * less runtime overhead (as it does not use any generator-function based features).
 * However, this may depend on how tasks get prioritized in the end also,
 * or how well the runtime is optimized and implemented for one or the other.
 * Maybe an await-resolution gets more attention to appear on the main-loop
 * than the scheduled interval, if it has immediate timeout (i.e 0), or the overhead
 * caused by yielding generators is neglectable.
 *
 * @param {AsyncSRT} asyncSrt
 * @param {number} socketFd
 * @param {Array<Uint8Array>} chunks
 * @param {Function} onWrite
 * @param {number} writesPerTick
 * @param {number} intervalMs
 */
function writeChunksWithExplicitScheduling(asyncSrt, socketFd, chunks,
  onWrite = null, writesPerTick = 1, intervalMs = 0) {

  let chunkIndex = 0;
  let chunkWrittenIdx = 0;

  // schedule tick-interval
  const writeTimer = setInterval(tick, intervalMs);
  // run once directly in current stack
  tick();

  function tick() {
    for (let i = 0; i < writesPerTick; i++) {

      if(chunkIndex >= chunks.length) {
        clearInterval(writeTimer);
        break;
      }

      const chunkBuf = chunks[chunkIndex++];

      asyncSrt.write(socketFd, chunkBuf)
        .then((writeRes) => {
          if (writeRes === SRT.ERROR) {
            throw new Error('AsyncSRT.write() failed');
          }
          if (onWrite) {
            onWrite(writeRes, chunkWrittenIdx);
          }
          chunkWrittenIdx++
        });
    }
  }

}

module.exports = {
  writeChunksWithYieldingLoop,
  writeChunksWithExplicitScheduling
}
