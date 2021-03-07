
import { SRTLoggingLevel, SRTResult, SRTSockOpt, SRTSockStatus } from "../src/srt-api-enums";

import { SRTReadReturn, SRTFileDescriptor, SRTEpollEvent, SRTSockOptValue, SRTStats } from "./srt-api"

export type AsyncSRTCallback<T> = (result: T) => void;

export class AsyncSRT {

  static TimeoutMs: number;

  /**
   *
   * @param sender
   * @returns SRTSOCKET identifier (integer value)
   */
  createSocket(sender: boolean, callback?: AsyncSRTCallback<number>): Promise<number>

  /**
   *
   * @param socket
   * @param address
   * @param port
   */
  bind(socket: number, address: string, port: number, callback?: AsyncSRTCallback<SRTResult>): Promise<SRTResult>

  /**
   *
   * @param socket
   * @param backlog
   */
  listen(socket: number, backlog: number, callback?: AsyncSRTCallback<SRTResult>): Promise<SRTResult>

  /**
   *
   * @param socket
   * @param host
   * @param port
   */
  connect(socket: number, host: string, port: number, callback?: AsyncSRTCallback<SRTResult>): Promise<SRTResult>

  /**
   *
   * @param socket
   * @returns File descriptor of incoming connection pipe
   */
  accept(socket: number, callback?: AsyncSRTCallback<SRTFileDescriptor>): Promise<SRTFileDescriptor>

  /**
   *
   * @param socket
   */
  close(socket: number, callback?: AsyncSRTCallback<SRTResult>): Promise<SRTResult>

  /**
   *
   * @param socket
   * @param chunkSize
   */
  read(socket: number, chunkSize: number, callback?: AsyncSRTCallback<SRTReadReturn>): Promise<SRTReadReturn>

  /**
   *
   * @param socket
   * @param chunk
   */
  write(socket: number, chunk: Buffer, callback?: AsyncSRTCallback<SRTResult>): Promise<number | SRTResult.SRT_ERROR>

  /**
   *
   * @param socket
   * @param option
   * @param value
   */
  setSockOpt(socket: number, option: SRTSockOpt, value: SRTSockOptValue, callback?: AsyncSRTCallback<SRTResult>): Promise<SRTResult>

  /**
   *
   * @param socket
   * @param option
   */
  getSockOpt(socket: number, option: SRTSockOpt, callback?: AsyncSRTCallback<SRTSockOptValue>): Promise<SRTSockOptValue>

  /**
   *
   * @param socket
   */
  getSockState(socket: number, callback?: AsyncSRTCallback<SRTSockStatus>): Promise<SRTSockStatus>

  /**
   * @returns epid
   */
  epollCreate(callback?: AsyncSRTCallback<number>): Promise<number>

  /**
   *
   * @param epid
   * @param socket
   * @param events
   */
  epollAddUsock(epid: number, socket: number, events: number, callback?: AsyncSRTCallback<SRTResult>): Promise<SRTResult>

  /**
   *
   * @param epid
   * @param msTimeOut
   */
  epollUWait(epid: number, msTimeOut: number, callback?: AsyncSRTCallback<SRTEpollEvent[]>): Promise<SRTEpollEvent[]>

  /**
   *
   * @param logLevel
   */
  setLogLevel(logLevel: SRTLoggingLevel, callback?: AsyncSRTCallback<SRTResult>): Promise<SRTResult>

  /**
   *
   * @param socket
   * @param clear if true, accumulated stats are cleared after each call
   */
   stats(socket: number, clear: boolean, callback?: AsyncSRTCallback<SRTStats>): Promise<SRTStats>

}
