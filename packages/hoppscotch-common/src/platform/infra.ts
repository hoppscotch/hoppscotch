import * as E from "fp-ts/Either"

export type InfraPlatformDef = {
  getIsSMTPEnabled?: () => Promise<E.Either<string, boolean>>
}
