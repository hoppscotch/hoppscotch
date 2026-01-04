import * as E from "fp-ts/Either"
import { Subscription } from "rxjs"
import {
  HoppCollectionVariable,
  HoppRESTAuth,
  HoppRESTHeader,
  translateToNewRequest,
} from "@hoppscotch/data"
import { pull, remove } from "lodash-es"
import { Subscription as WSubscription } from "wonka"
import {
  RootCollectionsOfTeamDocument,
  TeamCollectionAddedDocument,
  TeamCollectionUpdatedDocument,
  TeamCollectionRemovedDocument,
  TeamRequestAddedDocument,
  TeamRequestUpdatedDocument,
  TeamRequestDeletedDocument,
  GetCollectionChildrenDocument,
  GetCollectionRequestsDocument,
  TeamRequestMovedDocument,
  TeamCollectionMovedDocument,
  TeamRequestOrderUpdatedDocument,
  TeamCollectionOrderUpdatedDocument,
  TeamRootCollectionsSortedDocument,
  TeamChildCollectionSortedDocument,
} from "~/helpers/backend/graphql"
import { SecretEnvironmentService } from "~/services/secret-environment.service"
import { CurrentValueService } from "~/services/current-environment-value.service"
import { TeamCollection } from "~/helpers/teams/TeamCollection"
import { TeamRequest } from "~/helpers/teams/TeamRequest"
import { runGQLQuery, runGQLSubscription } from "~/helpers/backend/GQLClient"
import { HoppInheritedProperty } from "~/helpers/types/HoppInheritedProperties"
import { ref, watch } from "vue"
import { Service } from "dioc"
import { updateInheritedPropertiesForAffectedRequests } from "~/helpers/collection/collection"

export const TEAMS_BACKEND_PAGE_SIZE = 10

const findParentOfColl = (
  tree: TeamCollection[],
  collID: string,
  currentParent?: TeamCollection
): TeamCollection | null => {
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

const findCollInTree = (
  tree: TeamCollection[],
  targetID: string
): TeamCollection | null => {
  for (const coll of tree) {
    if (coll.id === targetID) return coll

    if (coll.children) {
      const result = findCollInTree(coll.children, targetID)
      if (result) return result
    }
  }

  return null
}

const deleteCollInTree = (tree: TeamCollection[], targetID: string) => {
  const parent = findParentOfColl(tree, targetID)

  if (parent && parent.children) {
    parent.children = parent.children.filter((coll) => coll.id !== targetID)
  }

  const el = findCollInTree(tree, targetID)
  if (!el) return

  pull(tree, el)
}

const updateCollInTree = (
  tree: TeamCollection[],
  updateColl: Partial<TeamCollection> & Pick<TeamCollection, "id">
) => {
  const el = findCollInTree(tree, updateColl.id)
  if (!el) return
  Object.assign(el, updateColl)
}

const findReqInTree = (
  tree: TeamCollection[],
  reqID: string
): TeamRequest | null => {
  for (const coll of tree) {
    if (coll.requests) {
      const match = coll.requests.find((req) => req.id === reqID)
      if (match) return match
    }

    if (coll.children) {
      const match = findReqInTree(coll.children, reqID)
      if (match) return match
    }
  }

  return null
}

const findCollWithReqIDInTree = (
  tree: TeamCollection[],
  reqID: string
): TeamCollection | null => {
  for (const coll of tree) {
    if (coll.requests) {
      if (coll.requests.find((req) => req.id === reqID)) return coll
    }

    if (coll.children) {
      const result = findCollWithReqIDInTree(coll.children, reqID)
      if (result) return result
    }
  }

  return null
}

export class TeamCollectionsService extends Service<void> {
  public static readonly ID = "TEAM_COLLECTIONS_SERVICE"

  //collection variables current value and secret value services
  private secretEnvironmentService = this.bind(SecretEnvironmentService)
  private currentEnvironmentValueService = this.bind(CurrentValueService)

  private teamID: string | null = null

  public collections = ref<TeamCollection[]>([])
  public loadingCollections = ref<string[]>([])
  public pendingTeamCollectionPath = ref<string | null>(null)

  private entityIDs: Set<string> = new Set()

  private teamCollectionAdded$: Subscription | null = null
  private teamCollectionUpdated$: Subscription | null = null
  private teamCollectionRemoved$: Subscription | null = null
  private teamRequestAdded$: Subscription | null = null
  private teamRequestUpdated$: Subscription | null = null
  private teamRequestDeleted$: Subscription | null = null
  private teamRequestMoved$: Subscription | null = null
  private teamCollectionMoved$: Subscription | null = null
  private teamRequestOrderUpdated$: Subscription | null = null
  private teamCollectionOrderUpdated$: Subscription | null = null
  private teamRootCollectionSorted$: Subscription | null = null
  private teamChildCollectionSorted$: Subscription | null = null

  private teamCollectionAddedSub: WSubscription | null = null
  private teamCollectionUpdatedSub: WSubscription | null = null
  private teamCollectionRemovedSub: WSubscription | null = null
  private teamRequestAddedSub: WSubscription | null = null
  private teamRequestUpdatedSub: WSubscription | null = null
  private teamRequestDeletedSub: WSubscription | null = null
  private teamRequestMovedSub: WSubscription | null = null
  private teamCollectionMovedSub: WSubscription | null = null
  private teamRequestOrderUpdatedSub: WSubscription | null = null
  private teamCollectionOrderUpdatedSub: WSubscription | null = null
  private teamRootCollectionSortedSub: WSubscription | null = null
  private teamChildCollectionSortedSub: WSubscription | null = null

  override onServiceInit() {
    this.collectionLoadingWatcher()
  }

  /**
   * Watches for loading collections and updates inherited properties once loading is done
   */
  private collectionLoadingWatcher() {
    watch(
      () => this.loadingCollections.value.length,
      (loadingCount) => {
        if (
          loadingCount === 0 &&
          this.pendingTeamCollectionPath.value &&
          this.collections.value.length > 0
        ) {
          updateInheritedPropertiesForAffectedRequests(
            this.pendingTeamCollectionPath.value,
            "rest"
          )
          this.pendingTeamCollectionPath.value = null
        }
      }
    )
  }

  /**
   * Change the current team ID and resets the collections
   * @param newTeamID The new team ID to switch to
   */
  public changeTeamID(newTeamID: string | null) {
    this.teamID = newTeamID
    this.collections.value = []
    this.entityIDs.clear()

    this.loadingCollections.value = []

    this.unsubscribeSubscriptions()

    if (this.teamID) this.initialize()
  }

  /**
   * Clears all collections and resets the service state
   */
  public clearCollections() {
    this.collections.value = []
    this.entityIDs.clear()
    this.loadingCollections.value = []
    this.unsubscribeSubscriptions()
    this.teamID = null
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
    this.teamRequestMoved$?.unsubscribe()
    this.teamCollectionMoved$?.unsubscribe()
    this.teamRequestOrderUpdated$?.unsubscribe()
    this.teamCollectionOrderUpdated$?.unsubscribe()
    this.teamRootCollectionSorted$?.unsubscribe()
    this.teamChildCollectionSorted$?.unsubscribe()

    this.teamCollectionAddedSub?.unsubscribe()
    this.teamCollectionUpdatedSub?.unsubscribe()
    this.teamCollectionRemovedSub?.unsubscribe()
    this.teamRequestAddedSub?.unsubscribe()
    this.teamRequestDeletedSub?.unsubscribe()
    this.teamRequestUpdatedSub?.unsubscribe()
    this.teamRequestMovedSub?.unsubscribe()
    this.teamCollectionMovedSub?.unsubscribe()
    this.teamRequestOrderUpdatedSub?.unsubscribe()
    this.teamCollectionOrderUpdatedSub?.unsubscribe()
    this.teamRootCollectionSortedSub?.unsubscribe()
    this.teamChildCollectionSortedSub?.unsubscribe()
  }

  private async initialize() {
    await this.loadRootCollections()
    this.registerSubscriptions()
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
    // Check if we have it already in the entity tree, if so, we don't need it again
    if (this.entityIDs.has(`collection-${collection.id}`)) return

    const tree = this.collections.value

    if (!parentCollectionID) {
      tree.push(collection)
    } else {
      const parentCollection = findCollInTree(tree, parentCollectionID)

      if (!parentCollection) return

      // Prevent adding child collections to a collection that has not been expanded yet incoming from GQL subscription, during import, etc
      // Hence, add entries to the pre-existing list without setting 'children' if it is `null'
      if (parentCollection.children !== null) {
        parentCollection.children.push(collection)
      }
    }

    // Add to entity ids set
    this.entityIDs.add(`collection-${collection.id}`)

    this.collections.value = tree
  }

  /**
   * Loads the root collections of the current team
   * @param replace Whether to replace the existing collections or append to them
   * We might want to replace when we are reloading the collections like when sorting the whole root collections
   */
  private async loadRootCollections(replace = false) {
    if (this.teamID === null) throw new Error("Team ID is null")

    this.loadingCollections.value.push("root")

    const totalCollections: TeamCollection[] = []

    while (true) {
      const result = await runGQLQuery({
        query: RootCollectionsOfTeamDocument,
        variables: {
          teamID: this.teamID,
          cursor:
            totalCollections.length > 0
              ? totalCollections[totalCollections.length - 1].id
              : undefined,
        },
      })

      if (E.isLeft(result)) {
        this.loadingCollections.value = this.loadingCollections.value.filter(
          (x) => x !== "root"
        )

        throw new Error(
          `Error fetching root collections: ${result.left?.error}`
        )
      }

      if (replace) {
        this.collections.value = []
        this.entityIDs.clear()

        totalCollections.push(
          ...result.right.rootCollectionsOfTeam.map(
            (x: any) =>
              <TeamCollection>{
                ...x,
                children: null,
                requests: null,
              }
          )
        )
      } else {
        totalCollections.push(
          ...result.right.rootCollectionsOfTeam.map(
            (x: any) =>
              <TeamCollection>{
                ...x,
                children: null,
                requests: null,
              }
          )
        )
      }

      if (result.right.rootCollectionsOfTeam.length !== TEAMS_BACKEND_PAGE_SIZE)
        break
    }

    this.loadingCollections.value = this.loadingCollections.value.filter(
      (x) => x !== "root"
    )

    // Add all the collections to the entity ids list
    totalCollections.forEach((coll) =>
      this.entityIDs.add(`collection-${coll.id}`)
    )

    this.collections.value.push(...totalCollections)
  }

  /**
   * Updates an existing collection in tree
   *
   * @param {Partial<TeamCollection> & Pick<TeamCollection, "id">} collectionUpdate - Object defining the fields that need to be updated (ID is required to find the target)
   */
  private updateCollection(
    collectionUpdate: Partial<TeamCollection> & Pick<TeamCollection, "id">
  ) {
    const tree = this.collections.value

    updateCollInTree(tree, collectionUpdate)

    this.collections.value = tree
  }

  /**
   * Removes a collection from the tree
   *
   * @param {string} collectionID - ID of the collection to remove
   */
  private removeCollection(collectionID: string) {
    const tree = this.collections.value

    deleteCollInTree(tree, collectionID)

    this.entityIDs.delete(`collection-${collectionID}`)

    this.collections.value = tree
  }

  /**
   * Adds a request to the tree
   *
   * @param {TeamRequest} request - The request to add to the tree
   */
  private addRequest(request: TeamRequest) {
    // Check if we have it already in the entity tree, if so, we don't need it again
    if (this.entityIDs.has(`request-${request.id}`)) return

    const tree = this.collections.value

    // Check if we have the collection (if not, then not loaded?)
    const coll = findCollInTree(tree, request.collectionID)
    if (!coll) return // Ignore add request

    // Collection is not expanded
    if (!coll.requests) return

    // Collection is expanded hence append request
    coll.requests.push(request)

    // Update the Entity IDs list
    this.entityIDs.add(`request-${request.id}`)

    this.collections.value = tree
  }

  /**
   * Updates the request in tree
   *
   * @param {Partial<TeamRequest> & Pick<TeamRequest, 'id'>} requestUpdate - Object defining all the fields to update in request (ID of the request is required)
   */
  private updateRequest(
    requestUpdate: Partial<TeamRequest> & Pick<TeamRequest, "id">
  ) {
    const tree = this.collections.value

    // Find request, if not present, don't update
    const req = findReqInTree(tree, requestUpdate.id)
    if (!req) return

    Object.assign(req, requestUpdate)

    this.collections.value = tree
  }

  /**
   * Removes a request from the tree
   *
   * @param {string} requestID - ID of the request to remove
   */
  private removeRequest(requestID: string) {
    const tree = this.collections.value

    // Find request in tree, don't attempt if no collection or no requests (expansion?)
    const coll = findCollWithReqIDInTree(tree, requestID)
    if (!coll || !coll.requests) return

    // Remove the collection
    remove(coll.requests, (req: any) => req.id === requestID)

    // Remove from entityIDs set
    this.entityIDs.delete(`request-${requestID}`)

    // Publish new tree
    this.collections.value = tree
  }

  /**
   * Moves a request from one collection to another
   *
   * @param {string} request - The request to move
   */
  private async moveRequest(request: TeamRequest) {
    const tree = this.collections.value

    // Remove the request from the current collection
    this.removeRequest(request.id)

    const currentRequest = request.request

    if (currentRequest === null || currentRequest === undefined) return

    // Find request in tree, don't attempt if no collection or no requests is found
    const collection = findCollInTree(tree, request.collectionID)
    if (!collection) return // Ignore add request

    // Collection is not expanded
    if (!collection.requests) return

    this.addRequest({
      id: request.id,
      collectionID: request.collectionID,
      request: translateToNewRequest(request.request),
      title: request.title,
    })
  }

  /**
   * Moves a collection from one collection to another or to root
   *
   * @param {string} collectionID - The ID of the collection to move
   */
  private async moveCollection(
    collectionID: string,
    parentID: string | null,
    title: string,
    data?: string | null
  ) {
    // Remove the collection from the current position
    this.removeCollection(collectionID)

    if (collectionID === null || parentID === undefined) return

    // Expand the parent collection if it is not expanded
    // so that the old children is also visible when expanding
    if (parentID) this.expandCollection(parentID)

    this.addCollection(
      {
        id: collectionID,
        children: null,
        requests: null,
        title: title,
        data,
      },
      parentID ?? null
    )
  }

  private reorderItems = (array: unknown[], from: number, to: number) => {
    const item = array.splice(from, 1)[0]
    if (from < to) {
      array.splice(to - 1, 0, item)
    } else {
      array.splice(to, 0, item)
    }
  }

  public updateRequestOrder(
    dragedRequestID: string,
    destinationRequestID: string | null,
    destinationCollectionID: string
  ) {
    const tree = this.collections.value

    // If the destination request is null, then it is the last request in the collection
    if (destinationRequestID === null) {
      const collection = findCollInTree(tree, destinationCollectionID)

      if (!collection) return // Ignore order update

      // Collection is not expanded
      if (!collection.requests) return

      const requestIndex = collection.requests.findIndex(
        (req) => req.id === dragedRequestID
      )

      // If the collection index is not found, don't update
      if (requestIndex === -1) return

      // Move the request to the end of the requests
      collection.requests.push(collection.requests.splice(requestIndex, 1)[0])
    } else {
      // Find collection in tree, don't attempt if no collection is found
      const collection = findCollInTree(tree, destinationCollectionID)
      if (!collection) return // Ignore order update

      // Collection is not expanded
      if (!collection.requests) return

      const requestIndex = collection.requests.findIndex(
        (req) => req.id === dragedRequestID
      )
      const destinationIndex = collection.requests.findIndex(
        (req) => req.id === destinationRequestID
      )

      if (requestIndex === -1) return

      this.reorderItems(collection.requests, requestIndex, destinationIndex)
    }

    this.collections.value = tree
  }

  public updateCollectionOrder = (
    collectionID: string,
    destinationCollectionID: string | null
  ) => {
    const tree = this.collections.value

    // If the destination collection is null, then it is the last collection in the tree
    if (destinationCollectionID === null) {
      const collLast = findParentOfColl(tree, collectionID)
      if (collLast && collLast.children) {
        const collectionIndex = collLast.children.findIndex(
          (coll) => coll.id === collectionID
        )

        // reorder the collection to the end of the collections
        collLast.children.push(collLast.children.splice(collectionIndex, 1)[0])
      } else {
        const collectionIndex = tree.findIndex(
          (coll) => coll.id === collectionID
        )

        // If the collection index is not found, don't update
        if (collectionIndex === -1) return

        // reorder the collection to the end of the collections in the root
        tree.push(tree.splice(collectionIndex, 1)[0])
      }
    } else {
      // Find collection in tree
      const coll = findParentOfColl(tree, destinationCollectionID)

      // If the collection has a parent collection and check if it has children
      if (coll && coll.children) {
        const collectionIndex = coll.children.findIndex(
          (coll) => coll.id === collectionID
        )

        const destinationIndex = coll.children.findIndex(
          (coll) => coll.id === destinationCollectionID
        )

        // If the collection index is not found, don't update
        if (collectionIndex === -1) return

        this.reorderItems(coll.children, collectionIndex, destinationIndex)
      } else {
        // If the collection has no parent collection, it is a root collection
        const collectionIndex = tree.findIndex(
          (coll) => coll.id === collectionID
        )

        const destinationIndex = tree.findIndex(
          (coll) => coll.id === destinationCollectionID
        )

        // If the collection index is not found, don't update
        if (collectionIndex === -1) return

        this.reorderItems(tree, collectionIndex, destinationIndex)
      }
    }

    this.collections.value = tree
  }

  private registerSubscriptions() {
    if (!this.teamID) return

    const [teamCollAdded$, teamCollAddedSub] = runGQLSubscription({
      query: TeamCollectionAddedDocument,
      variables: {
        teamID: this.teamID,
      },
    })

    this.teamCollectionAddedSub = teamCollAddedSub

    this.teamCollectionAdded$ = teamCollAdded$.subscribe((result: any) => {
      if (E.isLeft(result))
        throw new Error(
          `Team Collection Added Error: ${JSON.stringify(result.left)}`
        )

      this.addCollection(
        {
          id: result.right.teamCollectionAdded.id,
          children: null,
          requests: null,
          title: result.right.teamCollectionAdded.title,
          data: result.right.teamCollectionAdded.data ?? null,
        },
        result.right.teamCollectionAdded.parent?.id ?? null
      )
    })

    const [teamCollUpdated$, teamCollUpdatedSub] = runGQLSubscription({
      query: TeamCollectionUpdatedDocument,
      variables: {
        teamID: this.teamID,
      },
    })

    this.teamCollectionUpdatedSub = teamCollUpdatedSub
    this.teamCollectionUpdated$ = teamCollUpdated$.subscribe((result: any) => {
      if (E.isLeft(result))
        throw new Error(
          `Team Collection Updated Error: ${JSON.stringify(result.left)}`
        )

      this.updateCollection({
        id: result.right.teamCollectionUpdated.id,
        title: result.right.teamCollectionUpdated.title,
        data: result.right.teamCollectionUpdated.data,
      })

      this.loadingCollections.value = this.loadingCollections.value.filter(
        (x) => x !== result.right.teamCollectionUpdated.id
      )
    })

    const [teamCollRemoved$, teamCollRemovedSub] = runGQLSubscription({
      query: TeamCollectionRemovedDocument,
      variables: {
        teamID: this.teamID,
      },
    })

    this.teamCollectionRemovedSub = teamCollRemovedSub
    this.teamCollectionRemoved$ = teamCollRemoved$.subscribe((result: any) => {
      if (E.isLeft(result))
        throw new Error(
          `Team Collection Removed Error: ${JSON.stringify(result.left)}`
        )

      this.removeCollection(result.right.teamCollectionRemoved)
    })

    const [teamReqAdded$, teamReqAddedSub] = runGQLSubscription({
      query: TeamRequestAddedDocument,
      variables: {
        teamID: this.teamID,
      },
    })

    this.teamRequestAddedSub = teamReqAddedSub
    this.teamRequestAdded$ = teamReqAdded$.subscribe((result: any) => {
      if (E.isLeft(result))
        throw new Error(
          `Team Request Added Error: ${JSON.stringify(result.left)}`
        )

      this.addRequest({
        id: result.right.teamRequestAdded.id,
        collectionID: result.right.teamRequestAdded.collectionID,
        request: translateToNewRequest(
          JSON.parse(result.right.teamRequestAdded.request)
        ),
        title: result.right.teamRequestAdded.title,
      })
    })

    const [teamReqUpdated$, teamReqUpdatedSub] = runGQLSubscription({
      query: TeamRequestUpdatedDocument,
      variables: {
        teamID: this.teamID,
      },
    })

    this.teamRequestUpdatedSub = teamReqUpdatedSub
    this.teamRequestUpdated$ = teamReqUpdated$.subscribe((result: any) => {
      if (E.isLeft(result))
        throw new Error(
          `Team Request Updated Error: ${JSON.stringify(result.left)}`
        )

      this.updateRequest({
        id: result.right.teamRequestUpdated.id,
        collectionID: result.right.teamRequestUpdated.collectionID,
        request: JSON.parse(result.right.teamRequestUpdated.request),
        title: result.right.teamRequestUpdated.title,
      })
    })

    const [teamReqDeleted$, teamReqDeletedSub] = runGQLSubscription({
      query: TeamRequestDeletedDocument,
      variables: {
        teamID: this.teamID,
      },
    })

    this.teamRequestDeletedSub = teamReqDeletedSub
    this.teamRequestDeleted$ = teamReqDeleted$.subscribe((result: any) => {
      if (E.isLeft(result))
        throw new Error(
          `Team Request Deleted Error ${JSON.stringify(result.left)}`
        )

      this.removeRequest(result.right.teamRequestDeleted)
    })

    const [teamRequestMoved$, teamRequestMovedSub] = runGQLSubscription({
      query: TeamRequestMovedDocument,
      variables: {
        teamID: this.teamID,
      },
    })

    this.teamRequestMovedSub = teamRequestMovedSub
    this.teamRequestMoved$ = teamRequestMoved$.subscribe((result: any) => {
      if (E.isLeft(result))
        throw new Error(
          `Team Request Move Error ${JSON.stringify(result.left)}`
        )

      const { requestMoved } = result.right

      const request = {
        id: requestMoved.id,
        collectionID: requestMoved.collectionID,
        title: requestMoved.title,
        request: JSON.parse(requestMoved.request),
      }

      this.moveRequest(request)
    })

    const [teamCollectionMoved$, teamCollectionMovedSub] = runGQLSubscription({
      query: TeamCollectionMovedDocument,
      variables: {
        teamID: this.teamID,
      },
    })

    this.teamCollectionMovedSub = teamCollectionMovedSub
    this.teamCollectionMoved$ = teamCollectionMoved$.subscribe(
      (result: any) => {
        if (E.isLeft(result))
          throw new Error(
            `Team Collection Move Error ${JSON.stringify(result.left)}`
          )

        const { teamCollectionMoved } = result.right
        const { id, parent, title, data } = teamCollectionMoved

        const parentID = parent?.id ?? null

        this.moveCollection(id, parentID, title, data)
      }
    )

    const [teamRequestOrderUpdated$, teamRequestOrderUpdatedSub] =
      runGQLSubscription({
        query: TeamRequestOrderUpdatedDocument,
        variables: {
          teamID: this.teamID,
        },
      })

    this.teamRequestOrderUpdatedSub = teamRequestOrderUpdatedSub
    this.teamRequestOrderUpdated$ = teamRequestOrderUpdated$.subscribe(
      (result: any) => {
        if (E.isLeft(result))
          throw new Error(
            `Team Request Order Update Error ${JSON.stringify(result.left)}`
          )

        const { requestOrderUpdated } = result.right
        const { request } = requestOrderUpdated
        const { nextRequest } = requestOrderUpdated

        this.updateRequestOrder(
          request.id,
          nextRequest ? nextRequest.id : null,
          nextRequest ? nextRequest.collectionID : request.collectionID
        )
      }
    )

    const [teamCollectionOrderUpdated$, teamCollectionOrderUpdatedSub] =
      runGQLSubscription({
        query: TeamCollectionOrderUpdatedDocument,
        variables: {
          teamID: this.teamID,
        },
      })

    this.teamCollectionOrderUpdatedSub = teamCollectionOrderUpdatedSub
    this.teamCollectionOrderUpdated$ = teamCollectionOrderUpdated$.subscribe(
      (result: any) => {
        if (E.isLeft(result))
          throw new Error(
            `Team Collection Order Update Error ${JSON.stringify(result.left)}`
          )

        const { collectionOrderUpdated } = result.right
        const { collection } = collectionOrderUpdated
        const { nextCollection } = collectionOrderUpdated

        this.updateCollectionOrder(
          collection.id,
          nextCollection ? nextCollection.id : null
        )
      }
    )

    const [teamRootCollectionSorted$, teamRootCollectionSortedSub] =
      runGQLSubscription({
        query: TeamRootCollectionsSortedDocument,
        variables: {
          teamID: this.teamID,
        },
      })

    this.teamRootCollectionSortedSub = teamRootCollectionSortedSub
    this.teamRootCollectionSorted$ = teamRootCollectionSorted$.subscribe(
      (result: any) => {
        if (E.isLeft(result))
          throw new Error(
            `Team Root Collection Sorted Error ${JSON.stringify(result.left)}`
          )

        this.loadRootCollections(true)
      }
    )

    const [teamChildCollectionSorted$, teamChildCollectionSortedSub] =
      runGQLSubscription({
        query: TeamChildCollectionSortedDocument,
        variables: {
          teamID: this.teamID,
        },
      })

    this.teamChildCollectionSortedSub = teamChildCollectionSortedSub
    this.teamChildCollectionSorted$ = teamChildCollectionSorted$.subscribe(
      (result: any) => {
        if (E.isLeft(result))
          throw new Error(
            `Team Child Collection Sorted Error ${JSON.stringify(result.left)}`
          )

        const { teamChildCollectionsSorted } = result.right

        if (teamChildCollectionsSorted) {
          this.expandCollection(teamChildCollectionsSorted, true)
        }
      }
    )
  }

  private async getCollectionChildren(
    collection: TeamCollection
  ): Promise<TeamCollection[]> {
    const collections: TeamCollection[] = []

    while (true) {
      const data = await runGQLQuery({
        query: GetCollectionChildrenDocument,
        variables: {
          collectionID: collection.id,
          cursor:
            collections.length > 0
              ? collections[collections.length - 1].id
              : undefined,
        },
      })

      if (E.isLeft(data)) {
        throw new Error(
          `Child Collection Fetch Error for ${collection.id}: ${data.left}`
        )
      }

      collections.push(
        ...data.right.collection!.children.map(
          (el: any) =>
            <TeamCollection>{
              id: el.id,
              title: el.title,
              data: el.data,
              children: null,
              requests: null,
            }
        )
      )

      if (data.right.collection!.children.length !== TEAMS_BACKEND_PAGE_SIZE)
        break
    }

    return collections
  }

  private async getCollectionRequests(
    collection: TeamCollection
  ): Promise<TeamRequest[]> {
    const requests: TeamRequest[] = []

    while (true) {
      const data = await runGQLQuery({
        query: GetCollectionRequestsDocument,
        variables: {
          collectionID: collection.id,
          cursor:
            requests.length > 0 ? requests[requests.length - 1].id : undefined,
        },
      })

      if (E.isLeft(data)) {
        throw new Error(`Child Request Fetch Error for ${data}: ${data.left}`)
      }

      requests.push(
        ...data.right.requestsInCollection.map<TeamRequest>((el: any) => {
          return {
            id: el.id,
            collectionID: collection.id,
            title: el.title,
            request: translateToNewRequest(JSON.parse(el.request)),
          }
        })
      )

      if (data.right.requestsInCollection.length !== TEAMS_BACKEND_PAGE_SIZE)
        break
    }

    return requests
  }

  /**
   * Expands a collection on the tree
   *
   * When a collection is loaded initially in the adapter, children and requests are not loaded (they will be set to null)
   * Upon expansion those two fields will be populated
   *
   * @param {string} collectionID - The ID of the collection to expand
   * @param {boolean} reFetch - Whether to re-fetch the children and requests even if they are already loaded (used in sorting scenarios where order might have changed)
   */
  async expandCollection(collectionID: string, reFetch = false): Promise<void> {
    if (this.loadingCollections.value.includes(collectionID)) return

    const tree = this.collections.value

    const collection = findCollInTree(tree, collectionID)

    if (!collection) return

    if (collection.children !== null && !reFetch) return

    this.loadingCollections.value.push(collectionID)

    try {
      const [collections, requests] = await Promise.all([
        this.getCollectionChildren(collection),
        this.getCollectionRequests(collection),
      ])

      collection.children = collections
      collection.requests = requests

      // Add to the entity ids set
      collections.forEach((coll) => this.entityIDs.add(`collection-${coll.id}`))
      requests.forEach((req) => this.entityIDs.add(`request-${req.id}`))

      this.collections.value = [...tree]
    } catch (error) {
      console.error(`Error expanding collection ${collectionID}:`, error)

      // Set empty arrays instead of leaving as null to prevent future expansion attempts
      // This prevents the infinite loop by ensuring the collection is marked as expanded
      collection.children = []
      collection.requests = []

      this.collections.value = [...tree]
    } finally {
      this.loadingCollections.value = this.loadingCollections.value.filter(
        (x) => x !== collectionID
      )
    }
  }

  private getCurrentValue = (
    env: HoppCollectionVariable,
    varIndex: number,
    collectionID: string
  ) => {
    if (env && env.secret) {
      return this.secretEnvironmentService.getSecretEnvironmentVariable(
        collectionID,
        varIndex
      )?.value
    }
    return this.currentEnvironmentValueService.getEnvironmentVariable(
      collectionID,
      varIndex
    )?.currentValue
  }

  /**
   * This function populates the values of the variables with the current values or secrets.
   * @param variables Variables to populate
   * @returns Populated variables with current values or secrets
   */
  private populateValues(
    variables: HoppCollectionVariable[],
    parentID: string
  ) {
    return variables.map((v, index) => ({
      ...v,
      currentValue: this.getCurrentValue(v, index, parentID) ?? v.currentValue,
    }))
  }

  /**
   * Used to obtain the inherited auth and headers for a given folder path, used for both REST and GraphQL team collections
   * @param folderPath the path of the folder to cascade the auth from
   * @returns the inherited auth and headers for the given folder path
   */
  public cascadeParentCollectionForProperties(folderPath: string) {
    let auth: HoppInheritedProperty["auth"] = {
      parentID: folderPath ?? "",
      parentName: "",
      inheritedAuth: {
        authType: "none",
        authActive: true,
      },
    }
    const headers: HoppInheritedProperty["headers"] = []

    const variables: HoppInheritedProperty["variables"] = []

    if (!folderPath) return { auth, headers, variables }

    const path = folderPath.split("/")

    // Check if the path is empty or invalid
    if (!path || path.length === 0) {
      console.error("Invalid path:", folderPath)
      return { auth, headers, variables }
    }

    // Loop through the path and get the last parent folder with authType other than 'inherit'
    for (let i = 0; i < path.length; i++) {
      const parentFolder = findCollInTree(this.collections.value, path[i])

      // Check if parentFolder is undefined or null
      if (!parentFolder) {
        console.error("Parent folder not found for path:", path)
        return { auth, headers, variables }
      }

      const data: {
        auth: HoppRESTAuth
        headers: HoppRESTHeader[]
        variables: HoppCollectionVariable[]
      } = parentFolder.data
        ? JSON.parse(parentFolder.data)
        : {
            auth: null,
            headers: null,
            variables: null,
          }

      if (!data.auth) {
        data.auth = {
          authType: "inherit",
          authActive: true,
        }
        auth.parentID = path.slice(0, i + 1).join("/")
        auth.parentName = parentFolder.title
      }

      if (!data.headers) data.headers = []

      if (!data.variables) data.variables = []

      const parentFolderAuth = data.auth
      const parentFolderHeaders = data.headers
      const parentFolderVariables = data.variables

      if (
        parentFolderAuth?.authType === "inherit" &&
        path.slice(0, i + 1).length === 1
      ) {
        auth = {
          parentID: path.slice(0, i + 1).join("/"),
          parentName: parentFolder.title,
          inheritedAuth: auth.inheritedAuth,
        }
      }

      if (parentFolderAuth?.authType !== "inherit") {
        auth = {
          parentID: path.slice(0, i + 1).join("/"),
          parentName: parentFolder.title,
          inheritedAuth: parentFolderAuth,
        }
      }

      // Update headers, overwriting duplicates by key
      if (parentFolderHeaders) {
        const activeHeaders = parentFolderHeaders.filter((h) => h.active)
        activeHeaders.forEach((header) => {
          const index = headers.findIndex(
            (h) => h.inheritedHeader?.key === header.key
          )
          const currentPath = path.slice(0, i + 1).join("/")
          if (index !== -1) {
            // Replace the existing header with the same key
            headers[index] = {
              parentID: currentPath,
              parentName: parentFolder.title,
              inheritedHeader: header,
            }
          } else {
            headers.push({
              parentID: currentPath,
              parentName: parentFolder.title,
              inheritedHeader: header,
            })
          }
        })
      }

      // Update variables, overwriting duplicates by key
      if (parentFolderVariables) {
        const currentPath = [...path.slice(0, i + 1)].join("/")

        variables.push({
          parentPath: path.slice(0, i + 1).join("/"),
          parentID: parentFolder.id ?? currentPath,
          parentName: parentFolder.title,
          inheritedVariables: this.populateValues(
            parentFolderVariables,
            parentFolder.id ?? currentPath
          ),
        })
      }
    }

    return { auth, headers, variables }
  }

  private async waitForCollectionLoading(collectionID: string) {
    while (this.loadingCollections.value.includes(collectionID)) {
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  }

  /**
   * Used to obtain the inherited auth and headers for a given folder path
   * This function is async and will expand the collections if they are not expanded yet
   * @param folderPath the path of the folder to cascade the auth from
   * @returns the inherited auth and headers for the given folder path
   */
  public async cascadeParentCollectionForPropertiesAsync(folderPath: string) {
    if (!folderPath)
      return {
        auth: {
          parentID: "",
          parentName: "",
          inheritedAuth: {
            authType: "none",
            authActive: true,
          },
        },
        headers: [],
        variables: [],
      }

    const path = folderPath.split("/")

    // Check if the path is empty or invalid
    if (!path || path.length === 0) {
      console.error("Invalid path:", folderPath)
      return {
        auth: {
          parentID: "",
          parentName: "",
          inheritedAuth: {
            authType: "none",
            authActive: true,
          },
        },
        headers: [],
        variables: [],
      }
    }

    // Loop through the path and expand the collections if they are not expanded
    for (let i = 0; i < path.length; i++) {
      const parentFolder = findCollInTree(this.collections.value, path[i])

      if (parentFolder) {
        if (parentFolder.children === null) {
          if (this.loadingCollections.value.includes(parentFolder.id)) {
            await this.waitForCollectionLoading(parentFolder.id)
          } else {
            await this.expandCollection(parentFolder.id)
          }
        }
      }
    }

    return this.cascadeParentCollectionForProperties(folderPath)
  }
}
