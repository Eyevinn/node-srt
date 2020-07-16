/// <reference types="node" />

declare module "srt" {

  import {EventEmitter} from 'events';

  interface SRTServerBindOpts {
    /**
     * default: "0.0.0.0"
     */
    address?: string

    port: number
  }

  type SRTServerEvent = "listening" /*| "foobar" */;

  class SRTServer extends EventEmitter /*<SRTServerEvent>*/ {
    listen(opts: SRTServerBindOpts): void
  }

}
