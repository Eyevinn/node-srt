/**
 *
 * @param {Buffer | Uint8Array} srcData
 * @param {number} chunkMaxSize
 * @param {number} byteLength
 * @param {number} initialOffset
 * @returns {Array<Uint8Array>}
 */
function sliceBufferToChunks(srcData, chunkMaxSize,
    byteLength = srcData.byteLength, initialOffset = 0) {

  const chunks = [];
  let relativeOffset = 0;
  for (let offset = initialOffset; relativeOffset < byteLength; offset += chunkMaxSize) {
    relativeOffset = offset - initialOffset;
    const size = Math.min(chunkMaxSize, byteLength - relativeOffset);
    const chunkBuf
          = Uint8Array.prototype
              .slice.call(srcData, offset, offset + size);
    chunks.push(chunkBuf);
  }
  return chunks;
}

/**
 *
 * @param {Array<Uint8Array>} chunks Input chunks
 * @returns {number}
 */
function getChunksTotalByteLength(chunks) {
  return chunks.reduce((sumBytes, chunk) => (sumBytes + chunk.byteLength), 0)
}

/**
 *
 * @param {Array<Uint8Array>} chunks Input chunks
 * @param {Buffer} targetBuffer Optional, must have sufficient size
 * @returns {Buffer} Passed buffer or newly allocated
 */
function copyChunksIntoBuffer(chunks, targetBuffer = null) {
  if (!targetBuffer) {
    const totalSize = getChunksTotalByteLength(chunks);
    targetBuffer = Buffer.alloc(totalSize);
  }
  let offset = 0;
  for (let i = 0; i < chunks.length; i++) {
    if (offset >= targetBuffer.length) {
      throw new Error('Target buffer to merge chunks in is too small');
    }
    Buffer.from(chunks[i]).copy(targetBuffer, offset)
    offset += chunks[i].byteLength;
  }
  return targetBuffer;
}

module.exports = {
  getChunksTotalByteLength,
  copyChunksIntoBuffer,
  sliceBufferToChunks
}
