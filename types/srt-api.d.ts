import { SRTLoggingLevel, SRTResult, SRTSockOpt, SRTSockStatus } from "../src/srt-api-enums";

export interface SRTEpollEvent {
  socket: SRTFileDescriptor
  events: number
}

export type SRTReadReturn = Uint8Array | null | SRTResult.SRT_ERROR;

export type SRTFileDescriptor = number;

export type SRTSockOptValue = boolean | number | string

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
}

