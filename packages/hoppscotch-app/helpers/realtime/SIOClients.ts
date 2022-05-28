import wildcard from "socketio-wildcard"
import ClientV2 from "socket.io-client-v2"
import { io as ClientV4, Socket as SocketV4 } from "socket.io-client-v4"
import { io as ClientV3, Socket as SocketV3 } from "socket.io-client-v3"

type Options = {
  path: string
  auth: {
    token: string | undefined
  }
}

type PossibleEvent =
  | "connect"
  | "connect_error"
  | "reconnect_error"
  | "error"
  | "disconnect"
  | "*"

export interface SIOClient {
  connect(url: string, opts?: Options): void
  on(event: PossibleEvent, cb: (data: any) => void): void
  emit(event: string, data: any, cb: (data: any) => void): void
  close(): void
}

export class SIOClientV4 implements SIOClient {
  private client: SocketV4 | undefined
  connect(url: string, opts?: Options) {
    this.client = ClientV4(url, opts)
  }

  on(event: PossibleEvent, cb: (data: any) => void) {
    this.client?.on(event, cb)
  }

  emit(event: string, data: any, cb: (data: any) => void): void {
    this.client?.emit(event, data, cb)
  }

  close(): void {
    this.client?.close()
  }
}

export class SIOClientV3 implements SIOClient {
  private client: SocketV3 | undefined
  connect(url: string, opts?: Options) {
    this.client = ClientV3(url, opts)
  }

  on(event: PossibleEvent, cb: (data: any) => void): void {
    this.client?.on(event, cb)
  }

  emit(event: string, data: any, cb: (data: any) => void): void {
    this.client?.emit(event, data, cb)
  }

  close(): void {
    this.client?.close()
  }
}

export class SIOClientV2 implements SIOClient {
  private client: any | undefined
  connect(url: string, opts?: Options) {
    this.client = new ClientV2(url, opts)
    wildcard(ClientV2.Manager)(this.client)
  }

  on(event: PossibleEvent, cb: (data: any) => void): void {
    this.client?.on(event, cb)
  }

  emit(event: string, data: any, cb: (data: any) => void): void {
    this.client?.emit(event, data, cb)
  }

  close(): void {
    this.client?.close()
  }
}
