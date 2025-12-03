import { HoppCollection } from "@hoppscotch/data"
import { ReqType } from "~/helpers/backend/graphql"
import * as E from "fp-ts/Either"

export type CollectionsPlatformDef = {
  initCollectionsSync: () => void
  loadUserCollections?: (collectionType: "REST" | "GQL") => Promise<void>
  importToPersonalWorkspace?: (
    collections: HoppCollection[],
    reqType: ReqType
  ) => Promise<E.Either<string, { success: boolean }>>
}
