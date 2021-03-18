import { SRTLoggingLevel, SRTResult, SRTSockOpt, SRTSockStatus } from "../src/srt-api-enums";

export interface SRTEpollEvent {
  socket: SRTFileDescriptor
  events: number
}

export type SRTReadReturn = Uint8Array | null | SRTResult.SRT_ERROR;

export type SRTFileDescriptor = number;

export type SRTSockOptValue = boolean | number | string

export interface SRTStats {
  // global measurements
  msTimeStamp: number
  pktSentTotal: number
  pktRecvTotal: number
  pktSndLossTotal: number
  pktRcvLossTotal: number
  pktRetransTotal: number
  pktSentACKTotal: number
  pktRecvACKTotal: number
  pktSentNAKTotal: number
  pktRecvNAKTotal: number
  pktSndDropTotal: number
  pktRcvDropTotal: number
  pktRcvUndecryptTotal: number
  byteSentTotal: number
  byteRecvTotal: number
  byteRcvLossTotal: number
  byteRetransTotal: number
  byteSndDropTotal: number
  byteRcvDropTotal: number
  byteRcvUndecryptTotal: number

  // local measurements
  pktSent: number
  pktRecv: number
  pktSndLoss: number
  pktRcvLoss: number
  pktRetrans: number
  pktRcvRetrans: number
  pktSentACK: number
  pktRecvACK: number
  pktSentNAK: number
  pktRecvNAK: number
  mbpsSendRate: number
  mbpsRecvRate: number
  usSndDuration: number
  pktReorderDistance: number
  pktRcvAvgBelatedTime: number
  pktRcvBelated: number
  pktSndDrop: number
  pktRcvDrop: number
  pktRcvUndecrypt: number
  byteSent: number
  byteRecv: number
  byteRcvLoss: number
  byteRetrans: number
  byteSndDrop: number
  byteRcvDrop: number
  byteRcvUndecrypt: number

  // instant measurements
  usPktSndPeriod: number
  pktFlowWindow: number
  pktCongestionWindow: number
  pktFlightSize: number
  msRTT: number
  mbpsBandwidth: number
  byteAvailSndBuf: number
  byteAvailRcvBuf: number
  mbpsMaxBW: number
  byteMSS: number
  pktSndBuf: number
  byteSndBuf: number
  msSndBuf: number
  msSndTsbPdDelay: number
  pktRcvBuf: number
  byteRcvBuf: number
  msRcvBuf: number
  msRcvTsbPdDelay: number
  pktSndFilterExtraTotal: number
  pktRcvFilterExtraTotal: number
  pktRcvFilterSupplyTotal: number
  pktRcvFilterLossTotal: number
  pktSndFilterExtra: number
  pktRcvFilterExtra: number
  pktRcvFilterSupply: number
  pktRcvFilterLoss: number
  pktReorderTolerance: number
  
  // Total
  pktSentUniqueTotal: number
  pktRecvUniqueTotal: number
  byteSentUniqueTotal: number
  byteRecvUniqueTotal: number

  // Local
  pktSentUnique: number
  pktRecvUnique: number
  byteSentUnique: number
  byteRecvUnique: number
}

export class SRT {

  static OK: SRTResult.SRT_OK;
  static ERROR: SRTResult.SRT_ERROR;
  static INVALID_SOCK: SRTResult.SRT_ERROR;

  // TODO: add SOCKET_OPTIONS, SOCKET_STATUS enums
  //        and EPOLL_OPTS

  /**
   *
   * @param sender
   * @returns SRTSOCKET identifier (integer value)
   */
  createSocket(sender?: boolean): number

  /**
   *
   * @param socket
   * @param address
   * @param port
   */
  bind(socket: number, address: string, port: number): SRTResult

  /**
   *
   * @param socket
   * @param backlog
   */
  listen(socket: number, backlog: number): SRTResult

  /**
   *
   * @param socket
   * @param host
   * @param port
   */
  connect(socket: number, host: string, port: number): SRTResult

  /**
   *
   * @param socket
   * @returns File descriptor of incoming connection pipe
   */
  accept(socket: number): SRTFileDescriptor

  /**
   *
   * @param socket
   */
  close(socket: number): SRTResult

  /**
   *
   * @param socket
   * @param chunkSize
   */
  read(socket: number, chunkSize: number): SRTReadReturn

  /**
   *
   * @param socket
   * @param chunk
   */
  write(socket: number, chunk: Buffer): SRTResult

  /**
   *
   * @param socket
   * @param option
   * @param value
   */
  setSockOpt(socket: number, option: SRTSockOpt, value: SRTSockOptValue): SRTResult

  /**
   *
   * @param socket
   * @param option
   */
  getSockOpt(socket: number, option: SRTSockOpt): SRTSockOptValue

  /**
   *
   * @param socket
   */
  getSockState(socket: number): SRTSockStatus

  /**
   * @returns epid
   */
  epollCreate(): number

  /**
   *
   * @param epid
   * @param socket
   * @param events
   */
  epollAddUsock(epid: number, socket: number, events: number): SRTResult

  /**
   *
   * @param epid
   * @param msTimeOut
   */
  epollUWait(epid: number, msTimeOut: number): SRTEpollEvent[]

  /**
   *
   * @param logLevel Or 0 - 7 integer (not all values present in enum)
   */
  setLogLevel(logLevel: SRTLoggingLevel): SRTResult;

  /**
   *
   * @param socket
   * @param clear if true, accumulated stats are cleared after each call
   * @returns Current SRT statistics
   */
   stats(socket: number, clear: boolean): SRTStats;
}

