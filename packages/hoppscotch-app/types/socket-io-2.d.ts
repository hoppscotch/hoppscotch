// NOTE: This is an implementation just for shutting up
// tsc, this is really annoying (and maybe dangerous)
// We don't have access to the 2.4.0 typings, hence we make do with this,
// Check docs before you correct types again as you need

type Options = {
  path: string
  auth: {
    token: string | undefined
  }
}

declare module "socket.io-client-v2" {
  export type Socket = unknown
  export default class ClientV2 {
    static Manager: { prototype: EventEmitter } | undefined
    constructor(url: string, opts?: Options)
    on(event: string, cb: (data: any) => void): void
    emit(event: string, data: any, cb: (data: any) => void): void
    close(): void
  }
}
