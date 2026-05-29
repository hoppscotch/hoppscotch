import { TeamCollection } from "~/helpers/teams/TeamCollection"

/**
 * Recursively searches a TeamCollection tree for a collection matching the
 * given ID.  Only the bare leaf ID should be passed — not a slash-separated
 * path like "rootID/childID".
 *
 * @param collections - Root-level (or nested) collections to search.
 * @param collectionID - The exact `id` of the target collection.
 * @returns The matching `TeamCollection`, or `null` if not found.
 */
export function findTeamCollectionByID(
  collections: TeamCollection[],
  collectionID: string
): TeamCollection | null {
  for (const collection of collections) {
    if (collection.id === collectionID) return collection

    if (collection.children) {
      const nested = findTeamCollectionByID(collection.children, collectionID)
      if (nested) return nested
    }
  }

  return null
}
