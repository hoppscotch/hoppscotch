import { HoppCollection } from "@hoppscotch/data"
import { TeamCollection } from "~/helpers/teams/TeamCollection"

type CollectionPathResult = {
  path: string
  node: HoppCollection | TeamCollection
}

/**
 * Recursively search a collection tree to find a specific collection or folder by its ID or index path.
 * Supports both Personal (index-based paths like '0/1') and Team (ID-based paths) structures.
 */
export function resolveCollectionPath(
  collections: (HoppCollection | TeamCollection)[],
  targetID: string,
  currentPath = ""
): CollectionPathResult | null {
  for (let i = 0; i < collections.length; i++) {
    const coll = collections[i]
    // For Personal: path is index. For Team: path is ID.
    const isPersonal = "v" in coll
    const collID = isPersonal ? i.toString() : coll.id
    const collRefID = isPersonal ? coll._ref_id : undefined
    const collPath = currentPath ? `${currentPath}/${collID}` : collID

    if (
      collID === targetID ||
      (collRefID && collRefID === targetID) ||
      collPath === targetID
    ) {
      return { path: collPath, node: coll }
    }

    // Recursively check sub-nodes (Team collections use .children, Personal collections use .folders)
    const children = isPersonal ? coll.folders : coll.children
    if (children && children.length > 0) {
      const found = resolveCollectionPath(children, targetID, collPath)
      if (found) return found
    }
  }
  return null
}
