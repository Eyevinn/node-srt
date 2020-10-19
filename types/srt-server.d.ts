/// <reference types="node" />

import {EventEmitter} from 'events';
import { SRTResult, SRTSockOpt } from '../src/srt-api-enums';
import { SRTSockOptValue } from './srt-api';
import { AsyncSRT } from './srt-api-async';

export class AsyncReaderWriter {
  constructor(asyncSrt: AsyncSRT, socketFd: number);

  writeChunks(buffer: Uint8Array | Buffer, mtuSize: number,
    writesPerTick: number): Promise<void>;

  readChunks(minBytesRead: number,
    readBufSize: number,
    onRead: (buf: Uint8Array) => void,
    onError: (readResult: (SRTResult.SRT_ERROR | null)) => void): Promise<Uint8Array[]>;
}

export class SRTConnection extends EventEmitter {
  readonly fd: number;
  readonly gotFirstData: boolean;

  read(): Promise<Uint8Array | SRTResult.SRT_ERROR | null>;
  write(chunk: Buffer | Uint8Array): Promise<SRTResult>;
  close(): Promise<SRTResult | null>;

  isClosed(): boolean;

  onData(): void;

  getReaderWriter(): AsyncReaderWriter;
}

export class SRTServer extends EventEmitter /*<SRTServerEvent>*/ {

  static create(port: number, address?: string,
    epollPeriodMs?: number): Promise<SRTServer>;

  port: number;
  address: string;
  epollPeriodMs: number;
  socket: number;
  epid: number;

  constructor(port: number, address?: string, epollPeriodMs?: number);

  create(): Promise<SRTServer>;
  open(): Promise<SRTServer>;
  dispose(): Promise<SRTResult>;

  setSocketFlags(opts: SRTSockOpt[], values: SRTSockOptValue[]): Promise<SRTResult[]>;

  getConnectionByHandle(fd: number);
  getAllConnections(): SRTConnection[];
}


