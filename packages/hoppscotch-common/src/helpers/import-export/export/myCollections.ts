import { HoppCollection } from "@hoppscotch/data"
import { stripRefIdReplacer } from "."
import { stripCollectionTreeForStore } from "~/helpers/secretVariables"

export const myCollectionsExporter = (myCollections: HoppCollection[]) => {
  // Strip secret variable values from the tree BEFORE stringify. The
  // exported JSON is a file the user may share, commit, or upload — raw
  // secrets must not travel with it. The local secret store retains the
  // values keyed by `_ref_id` for the user's own device.
  const stripped = myCollections.map(stripCollectionTreeForStore)
  return JSON.stringify(stripped, stripRefIdReplacer, 2)
}
