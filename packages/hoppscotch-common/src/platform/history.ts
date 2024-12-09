import * as E from "fp-ts/Either"

export type HistoryPlatformDef = {
  initHistorySync: () => void
  isUserHistoryEnabled?: () => Promise<E.Either<string, boolean>>
}
