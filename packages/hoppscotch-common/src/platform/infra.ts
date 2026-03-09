import * as E from "fp-ts/Either"

type ProxyAppUrl = {
  value: string
  name: string
}

export type InfraPlatformDef = {
  getIsSMTPEnabled?: () => Promise<E.Either<string, boolean>>
  getProxyAppUrl?: () => Promise<E.Either<string, ProxyAppUrl>>
}
