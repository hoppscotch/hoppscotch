import { BehaviorSubject } from "rxjs"
import { gql } from "graphql-tag"
import pull from "lodash/pull"
import remove from "lodash/remove"
import { translateToNewRequest } from "../types/HoppRESTRequest"
import { TeamCollection } from "./TeamCollection"
import { TeamRequest } from "./TeamRequest"
import {
  rootCollectionsOfTeam,
  getCollectionChildren,
  getCollectionRequests,
} from "./utils"
import { apolloClient } from "~/helpers/apollo"

/*
 * NOTE: These functions deal with REFERENCES to objects and mutates them, for a simpler implementation.
 * Be careful when you play with these.
 *
 * I am not a fan of mutating references but this is so much simpler compared to mutating clones
 * - Andrew
 */

/**
 * Finds the parent of a collection and returns the REFERENCE (or null)
 *
 * @param {TeamCollection[]} tree - The tree to look in
 * @param {string} collID - ID of the collection to find the parent of
 * @param {TeamCollection} currentParent - (used for recursion, do not set) The parent in the current iteration (undefined if root)
 *
 * @returns REFERENCE to the collecton or null if not found or the collection is in root
 */
function findParentOfColl(
  tree: TeamCollection[],
  collID: string,
  currentParent?: TeamCollection
): TeamCollection | null {
  for (const coll of tree) {
    // If the root is parent, return null
    if (coll.id === collID) return currentParent || null

    // Else run it in children
    if (coll.children) {
      const result = findParentOfColl(coll.children, collID, coll)
      if (result) return result
    }
  }

  return null
}

/**
 * Finds and returns a REFERENCE collection in the given tree (or null)
 *
 * @param {TeamCollection[]} tree - The tree to look in
 * @param {string} targetID - The ID of the collection to look for
 *
 * @returns REFERENCE to the collection or null if not found
 */
function findCollInTree(
  tree: TeamCollection[],
  targetID: string
): TeamCollection | null {
  for (const coll of tree) {
    // If the direct child matched, then return that
    if (coll.id === targetID) return coll

    // Else run it in the children
    if (coll.children) {
      const result = findCollInTree(coll.children, targetID)
      if (result) return result
    }
  }

  // If nothing matched, return null
  return null
}

/**
 * Finds and returns a REFERENCE to the collection containing a given request ID in tree (or null)
 *
 * @param {TeamCollection[]} tree - The tree to look in
 * @param {string} reqID - The ID of the request to look for
 *
 * @returns REFERENCE to the collection or null if request not found
 */
function findCollWithReqIDInTree(
  tree: TeamCollection[],
  reqID: string
): TeamCollection | null {
  for (const coll of tree) {
    // Check in root collections (if expanded)
    if (coll.requests) {
      if (coll.requests.find((req) => req.id === reqID)) return coll
    }

    // Check in children of collections
    if (coll.children) {
      const result = findCollWithReqIDInTree(coll.children, reqID)
      if (result) return result
    }
  }

  // No matches
  return null
}

/**
 * Finds and returns a REFERENCE to the request with the given ID (or null)
 *
 * @param {TeamCollection[]} tree - The tree to look in
 * @param {string} reqID - The ID of the request to look for
 *
 * @returns REFERENCE to the request or null if request not found
 */
function findReqInTree(
  tree: TeamCollection[],
  reqID: string
): TeamRequest | null {
  for (const coll of tree) {
    // Check in root collections (if expanded)
    if (coll.requests) {
      const match = coll.requests.find((req) => req.id === reqID)
      if (match) return match
    }

    // Check in children of collections
    if (coll.children) {
      const match = findReqInTree(coll.children, reqID)
      if (match) return match
    }
  }

  // No matches
  return null
}

/**
 * Updates a collection in the tree with the specified data
 *
 * @param {TeamCollection[]} tree - The tree to update in (THIS WILL BE MUTATED!)
 * @param {Partial<TeamCollection> & Pick<TeamCollection, "id">} updateColl - An object defining all the fields that should be updated (ID is required to find the target collection)
 */
function updateCollInTree(
  tree: TeamCollection[],
  updateColl: Partial<TeamCollection> & Pick<TeamCollection, "id">
) {
  const el = findCollInTree(tree, updateColl.id)

  // If no match, stop the operation
  if (!el) return

  // Update all the specified keys
  Object.assign(el, updateColl)
}

/**
 * Deletes a collection in the tree
 *
 * @param {TeamCollection[]} tree - The tree to delete in (THIS WILL BE MUTATED!)
 * @param {string} targetID - ID of the collection to delete
 */
function deleteCollInTree(tree: TeamCollection[], targetID: string) {
  // Get the parent owning the collection
  const parent = findParentOfColl(tree, targetID)

  // If we found a parent, update it
  if (parent && parent.children) {
    parent.children = parent.children.filter((coll) => coll.id !== targetID)
  }

  // If there is no parent, it could mean:
  //  1. The collection with that ID does not exist
  //  2. The collection is in root (therefore, no parent)

  // Let's look for element, if not exist, then stop
  const el = findCollInTree(tree, targetID)
  if (!el) return

  // Collection exists, so this should be in root, hence removing element
  pull(tree, el)
}

/**
 * TeamCollectionAdapter provides a reactive collections list for a specific team
 */
export default class TeamCollectionAdapter {
  /**
   * The reactive list of collections
   *
   * A new value is emitted when there is a change
   * (Use views instead)
   */
  collections$: BehaviorSubject<TeamCollection[]>

  // Fields for subscriptions, used for destroying once not needed
  private teamCollectionAdded$: ZenObservable.Subscription | null
  private teamCollectionUpdated$: ZenObservable.Subscription | null
  private teamCollectionRemoved$: ZenObservable.Subscription | null
  private teamRequestAdded$: ZenObservable.Subscription | null
  private teamRequestUpdated$: ZenObservable.Subscription | null
  private teamRequestDeleted$: ZenObservable.Subscription | null

  /**
   * @constructor
   *
   * @param {string | null} teamID - ID of the team to listen to, or null if none decided and the adapter should stand by
   */
  constructor(private teamID: string | null) {
    this.collections$ = new BehaviorSubject<TeamCollection[]>([])
    this.teamCollectionAdded$ = null
    this.teamCollectionUpdated$ = null
    this.teamCollectionRemoved$ = null
    this.teamRequestAdded$ = null
    this.teamRequestDeleted$ = null
    this.teamRequestUpdated$ = null

    if (this.teamID) this.initialize()
  }

  /**
   * Updates the team the adapter is looking at
   *
   * @param {string | null} newTeamID - ID of the team to listen to, or null if none decided and the adapter should stand by
   */
  changeTeamID(newTeamID: string | null) {
    this.collections$.next([])

    this.teamID = newTeamID

    if (this.teamID) this.initialize()
  }

  /**
   * Unsubscribes from the subscriptions
   * NOTE: Once this is called, no new updates to the tree will be detected
   */
  unsubscribeSubscriptions() {
    this.teamCollectionAdded$?.unsubscribe()
    this.teamCollectionUpdated$?.unsubscribe()
    this.teamCollectionRemoved$?.unsubscribe()
    this.teamRequestAdded$?.unsubscribe()
    this.teamRequestDeleted$?.unsubscribe()
    this.teamRequestUpdated$?.unsubscribe()
  }

  /**
   * Initializes the adapter
   */
  private async initialize() {
    await this.loadRootCollections()
    this.registerSubscriptions()
  }

  /**
   * Loads the root collections
   */
  private async loadRootCollections(): Promise<void> {
    const colls = await rootCollectionsOfTeam(apolloClient, this.teamID)
    this.collections$.next(colls)
  }

  /**
   * Performs addition of a collection to the tree
   *
   * @param {TeamCollection} collection - The collection to add to the tree
   * @param {string | null} parentCollectionID - The parent of the new collection, pass null if this collection is in root
   */
  private addCollection(
    collection: TeamCollection,
    parentCollectionID: string | null
  ) {
    const tree = this.collections$.value

    if (!parentCollectionID) {
      tree.push(collection)
    } else {
      const parentCollection = findCollInTree(tree, parentCollectionID)

      if (!parentCollection) return

      if (parentCollection.children != null) {
        parentCollection.children.push(collection)
      } else {
        parentCollection.children = [collection]
      }
    }

    this.collections$.next(tree)
  }

  /**
   * Updates an existing collection in tree
   *
   * @param {Partial<TeamCollection> & Pick<TeamCollection, "id">} collectionUpdate - Object defining the fields that need to be updated (ID is required to find the target)
   */
  private updateCollection(
    collectionUpdate: Partial<TeamCollection> & Pick<TeamCollection, "id">
  ) {
    const tree = this.collections$.value

    updateCollInTree(tree, collectionUpdate)

    this.collections$.next(tree)
  }

  /**
   * Removes a collection from the tree
   *
   * @param {string} collectionID - ID of the collection to remove
   */
  private removeCollection(collectionID: string) {
    const tree = this.collections$.value

    deleteCollInTree(tree, collectionID)

    this.collections$.next(tree)
  }

  /**
   * Adds a request to the tree
   *
   * @param {TeamRequest} request - The request to add to the tree
   */
  private addRequest(request: TeamRequest) {
    const tree = this.collections$.value

    // Check if we have the collection (if not, then not loaded?)
    const coll = findCollInTree(tree, request.collectionID)
    if (!coll) return // Ignore add request

    // Collection is not expanded
    if (!coll.requests) return

    // Collection is expanded hence append request
    coll.requests.push(request)

    this.collections$.next(tree)
  }

  /**
   * Removes a request from the tree
   *
   * @param {string} requestID - ID of the request to remove
   */
  private removeRequest(requestID: string) {
    const tree = this.collections$.value

    // Find request in tree, don't attempt if no collection or no requests (expansion?)
    const coll = findCollWithReqIDInTree(tree, requestID)
    if (!coll || !coll.requests) return

    // Remove the collection
    remove(coll.requests, (req) => req.id === requestID)

    // Publish new tree
    this.collections$.next(tree)
  }

  /**
   * Updates the request in tree
   *
   * @param {Partial<TeamRequest> & Pick<TeamRequest, 'id'>} requestUpdate - Object defining all the fields to update in request (ID of the request is required)
   */
  private updateRequest(
    requestUpdate: Partial<TeamRequest> & Pick<TeamRequest, "id">
  ) {
    const tree = this.collections$.value

    // Find request, if not present, don't update
    const req = findReqInTree(tree, requestUpdate.id)
    if (!req) return

    Object.assign(req, requestUpdate)

    this.collections$.next(tree)
  }

  /**
   * Registers the subscriptions to listen to team collection updates
   */
  registerSubscriptions() {
    this.teamCollectionAdded$ = apolloClient
      .subscribe({
        query: gql`
          subscription TeamCollectionAdded($teamID: String!) {
            teamCollectionAdded(teamID: $teamID) {
              id
              title
              parent {
                id
              }
            }
          }
        `,
        variables: {
          teamID: this.teamID,
        },
      })
      .subscribe(({ data }) => {
        this.addCollection(
          {
            id: data.teamCollectionAdded.id,
            children: null,
            requests: null,
            title: data.teamCollectionAdded.title,
          },
          data.teamCollectionAdded.parent?.id
        )
      })

    this.teamCollectionUpdated$ = apolloClient
      .subscribe({
        query: gql`
          subscription TeamCollectionUpdated($teamID: String!) {
            teamCollectionUpdated(teamID: $teamID) {
              id
              title
              parent {
                id
              }
            }
          }
        `,
        variables: {
          teamID: this.teamID,
        },
      })
      .subscribe(({ data }) => {
        this.updateCollection({
          id: data.teamCollectionUpdated.id,
          title: data.teamCollectionUpdated.title,
        })
      })

    this.teamCollectionRemoved$ = apolloClient
      .subscribe({
        query: gql`
          subscription TeamCollectionRemoved($teamID: String!) {
            teamCollectionRemoved(teamID: $teamID)
          }
        `,
        variables: {
          teamID: this.teamID,
        },
      })
      .subscribe(({ data }) => {
        this.removeCollection(data.teamCollectionRemoved)
      })

    this.teamRequestAdded$ = apolloClient
      .subscribe({
        query: gql`
          subscription TeamRequestAdded($teamID: String!) {
            teamRequestAdded(teamID: $teamID) {
              id
              collectionID
              request
              title
            }
          }
        `,
        variables: {
          teamID: this.teamID,
        },
      })
      .subscribe(({ data }) => {
        this.addRequest({
          id: data.teamRequestAdded.id,
          collectionID: data.teamRequestAdded.collectionID,
          request: translateToNewRequest(
            JSON.parse(data.teamRequestAdded.request)
          ),
          title: data.teamRequestAdded.title,
        })
      })

    this.teamRequestUpdated$ = apolloClient
      .subscribe({
        query: gql`
          subscription TeamRequestUpdated($teamID: String!) {
            teamRequestUpdated(teamID: $teamID) {
              id
              collectionID
              request
              title
            }
          }
        `,
        variables: {
          teamID: this.teamID,
        },
      })
      .subscribe(({ data }) => {
        this.updateRequest({
          id: data.teamRequestUpdated.id,
          collectionID: data.teamRequestUpdated.collectionID,
          request: JSON.parse(data.teamRequestUpdated.request),
          title: data.teamRequestUpdated.title,
        })
      })

    this.teamRequestDeleted$ = apolloClient
      .subscribe({
        query: gql`
          subscription TeamRequestDeleted($teamID: String!) {
            teamRequestDeleted(teamID: $teamID)
          }
        `,
        variables: {
          teamID: this.teamID,
        },
      })
      .subscribe(({ data }) => {
        this.removeRequest(data.teamRequestDeleted)
      })
  }

  /**
   * Expands a collection on the tree
   *
   * When a collection is loaded initially in the adapter, children and requests are not loaded (they will be set to null)
   * Upon expansion those two fields will be populated
   *
   * @param {string} collectionID - The ID of the collection to expand
   */
  async expandCollection(collectionID: string): Promise<void> {
    // TODO: While expanding one collection, block (or queue) the expansion of the other, to avoid race conditions
    const tree = this.collections$.value

    const collection = findCollInTree(tree, collectionID)

    if (!collection) return

    if (collection.children != null) return

    const collections: TeamCollection[] = (
      await getCollectionChildren(apolloClient, collectionID)
    ).map<TeamCollection>((el) => {
      return {
        id: el.id,
        title: el.title,
        children: null,
        requests: null,
      }
    })

    const requests: TeamRequest[] = (
      await getCollectionRequests(apolloClient, collectionID)
    ).map<TeamRequest>((el) => {
      return {
        id: el.id,
        collectionID,
        title: el.title,
        request: translateToNewRequest(JSON.parse(el.request)),
      }
    })

    collection.children = collections
    collection.requests = requests

    this.collections$.next(tree)
  }
}
