import { CollectionsPlatformDef } from "~/platform/collections"

import {
  exportUserCollectionsToJSON,
  runUserChildCollectionSortedSubscription,
  runUserCollectionCreatedSubscription,
  runUserCollectionDuplicatedSubscription,
  runUserCollectionMovedSubscription,
  runUserCollectionOrderUpdatedSubscription,
  runUserCollectionRemovedSubscription,
  runUserCollectionUpdatedSubscription,
  runUserRequestCreatedSubscription,
  runUserRequestDeletedSubscription,
  runUserRequestMovedSubscription,
  runUserRequestUpdatedSubscription,
  runUserRootCollectionsSortedSubscription,
} from "./api"
import { collectionsSyncer, getStoreByCollectionType } from "./sync"

import {
  generateUniqueRefId,
  GQLHeader,
  HoppCollection,
  HoppGQLRequest,
  HoppRESTHeaders,
  HoppRESTParam,
  HoppRESTRequest,
  isGQLRequest,
  makeCollection,
} from "@hoppscotch/data"
import * as E from "fp-ts/Either"
import { runGQLSubscription } from "~/helpers/backend/GQLClient"
import {
  ReqType,
  UserCollectionDuplicatedData,
  UserRequest,
} from "~/helpers/backend/graphql"
import {
  addGraphqlCollection,
  addGraphqlFolder,
  addRESTCollection,
  addRESTFolder,
  editGraphqlCollection,
  editGraphqlFolder,
  editGraphqlRequest,
  editRESTCollection,
  editRESTFolder,
  editRESTRequest,
  graphqlCollectionStore,
  moveGraphqlFolder,
  moveGraphqlRequest,
  moveRESTFolder,
  moveRESTRequest,
  navigateToFolderWithIndexPath,
  removeGraphqlCollection,
  removeGraphqlFolder,
  removeGraphqlRequest,
  removeRESTCollection,
  removeRESTFolder,
  removeRESTRequest,
  restCollectionStore,
  saveGraphqlRequestAs,
  saveRESTRequestAs,
  setGraphqlCollections,
  setRESTCollections,
  sortGraphqlCollection,
  sortGraphqlFolder,
  sortRESTCollection,
  sortRESTFolder,
  updateGraphqlCollectionOrder,
  updateRESTCollectionOrder,
  updateRESTRequestOrder,
} from "~/newstore/collections"
import { platform } from "~/platform"
import { Store } from "~/kernel/store"
import { runDispatchWithOutSyncing } from ".."
import { gqlCollectionsSyncer } from "./gqlCollections.sync"
import { importToPersonalWorkspace } from "./import"
import {
  pauseCollectionPersistenceWrites,
  resumeCollectionPersistenceWrites,
} from "./persistence-gate"

// Same namespace the shared collection list uses. Per-account copies live
// under their own keys so logout can clear the shared list without deleting
// the only copy of unsynced work.
const COLLECTION_STORE_NAMESPACE = "persistence.v1"

let signedInUserId: string | null = null
let collectionLoadGeneration = 0
let ownedCollectionSave: Promise<void> = Promise.resolve()

const LOCAL_ONLY_COLLECTION_ID_SUFFIX = "-duplicate-collection"

type OwnedCollectionSnapshot = {
  rest: HoppCollection[]
  gql: HoppCollection[]
  revision?: number
}

type OwnedCollectionRecovery = OwnedCollectionSnapshot & {
  ownerId: string
}

// Used only when neither disk write succeeds. Keyed by owner so one account
// cannot replace another's copy. Entries stay private until that owner signs in.
const memoryRecoveryByOwner = new Map<string, OwnedCollectionSnapshot>()
// Set when logout cannot clear the restored marker. Sign-in must still
// apply this account's copy even if the old marker remains on disk.
const forceRestoreUserIds = new Set<string>()
const SHARED_REST_COLLECTIONS_KEY = "restCollections"
const SHARED_GQL_COLLECTIONS_KEY = "gqlCollections"

function ownedCollectionKey(userId: string) {
  return `collections.user.${userId}`
}

function recoveryKey(userId: string) {
  return `collections.user.${userId}.recovery`
}

function restoredKey(userId: string) {
  return `collections.user.${userId}.restored`
}

function appliedKey(userId: string) {
  return `collections.user.${userId}.appliedRevision`
}

let snapshotRevision = 0

function nextSnapshotRevision() {
  snapshotRevision = Math.max(Date.now(), snapshotRevision + 1)
  return snapshotRevision
}

function newerSnapshot(
  ...candidates: Array<OwnedCollectionSnapshot | undefined>
) {
  let best: OwnedCollectionSnapshot | undefined
  for (const candidate of candidates) {
    if (!candidate) continue
    if (!best || (candidate.revision ?? 0) >= (best.revision ?? 0)) {
      best = candidate
    }
  }
  return best
}

function isUnsyncedCollectionId(id: string | undefined) {
  return id == null || id === "" || id.endsWith(LOCAL_ONLY_COLLECTION_ID_SUFFIX)
}

function serverBackedId(id: string | undefined): id is string {
  return !isUnsyncedCollectionId(id)
}

function collectServerBackedIds(collections: HoppCollection[]) {
  const ids = new Set<string>()
  const walk = (list: HoppCollection[]) => {
    for (const collection of list) {
      if (serverBackedId(collection.id)) ids.add(collection.id)
      for (const request of collection.requests) {
        if (serverBackedId(request.id)) ids.add(request.id)
      }
      walk(collection.folders)
    }
  }
  walk(collections)
  return ids
}

function localItemKey(item: { id?: string; _ref_id?: string }) {
  if (item._ref_id) return `ref:${item._ref_id}`
  if (item.id) return `id:${item.id}`
  return undefined
}

function containsUnsyncedWork(collection: HoppCollection): boolean {
  if (isUnsyncedCollectionId(collection.id)) return true
  if (
    collection.requests.some((request) => isUnsyncedCollectionId(request.id))
  ) {
    return true
  }
  return collection.folders.some(containsUnsyncedWork)
}

function mergeUnsyncedRequests(
  current: HoppCollection["requests"],
  saved: HoppCollection["requests"]
): HoppCollection["requests"] {
  const seen = new Set(
    current.flatMap((request) => {
      const key = localItemKey(request)
      return key ? [key] : []
    })
  )
  const merged = current.slice()
  for (const request of saved) {
    if (!isUnsyncedCollectionId(request.id)) continue
    const key = localItemKey(request)
    if (key && seen.has(key)) continue
    if (key) seen.add(key)
    merged.push(request)
  }
  return merged
}

function mergeUnsyncedCollections(
  current: HoppCollection[],
  saved: HoppCollection[]
): HoppCollection[] {
  const merged = current.map((collection) => ({ ...collection }))
  for (const savedCollection of saved) {
    const savedKey = localItemKey(savedCollection)
    const match = savedKey
      ? merged.find((collection) => localItemKey(collection) === savedKey)
      : undefined
    if (match) {
      match.folders = mergeUnsyncedCollections(
        match.folders,
        savedCollection.folders
      )
      match.requests = mergeUnsyncedRequests(
        match.requests,
        savedCollection.requests
      )
      continue
    }
    if (containsUnsyncedWork(savedCollection)) merged.push(savedCollection)
  }
  return merged
}

function restoreCollectionList(
  current: HoppCollection[],
  saved: HoppCollection[]
) {
  if (current.length === 0) return saved
  return mergeUnsyncedCollections(current, saved)
}

function keepLocalItemMissingFromExport(
  id: string,
  serverIdsAtStart: Set<string>
) {
  // An id assigned while the export was in flight is not proof the server
  // deleted that item. Only ids that were already saved when the load began
  // can be dropped.
  return isUnsyncedCollectionId(id) || !serverIdsAtStart.has(id)
}

function isActiveCollectionSession(userId: string, generation: number) {
  return signedInUserId === userId && collectionLoadGeneration === generation
}

function copyCollections(collections: HoppCollection[]) {
  return JSON.parse(JSON.stringify(collections)) as HoppCollection[]
}

function snapshotFromValue(value: unknown): OwnedCollectionSnapshot | undefined {
  if (!value || typeof value !== "object") return undefined
  const snapshot = value as OwnedCollectionSnapshot
  if (!Array.isArray(snapshot.rest) || !Array.isArray(snapshot.gql)) {
    return undefined
  }
  return snapshot
}

async function readOwnedCollections(userId: string) {
  const result = await Store.get<unknown>(
    COLLECTION_STORE_NAMESPACE,
    ownedCollectionKey(userId)
  )
  if (E.isRight(result)) {
    const snapshot = snapshotFromValue(result.right)
    if (snapshot) return snapshot
  }

  // Earlier revisions stored the two lists under separate keys.
  const [restResult, gqlResult] = await Promise.all([
    Store.get<HoppCollection[]>(
      COLLECTION_STORE_NAMESPACE,
      `restCollections.user.${userId}`
    ),
    Store.get<HoppCollection[]>(
      COLLECTION_STORE_NAMESPACE,
      `gqlCollections.user.${userId}`
    ),
  ])
  const rest =
    E.isRight(restResult) && Array.isArray(restResult.right)
      ? restResult.right
      : undefined
  const gql =
    E.isRight(gqlResult) && Array.isArray(gqlResult.right)
      ? gqlResult.right
      : undefined
  if (rest === undefined && gql === undefined) return undefined
  return { rest: rest ?? [], gql: gql ?? [] }
}

async function saveOwnedCollections(
  userId: string,
  rest: HoppCollection[],
  gql: HoppCollection[],
  revision: number
) {
  const saved = await Store.set(
    COLLECTION_STORE_NAMESPACE,
    ownedCollectionKey(userId),
    { rest, gql, revision } satisfies OwnedCollectionSnapshot
  )
  if (E.isLeft(saved)) return false

  const stored = await Store.get<unknown>(
    COLLECTION_STORE_NAMESPACE,
    ownedCollectionKey(userId)
  )
  if (E.isLeft(stored)) return false
  const snapshot = snapshotFromValue(stored.right)
  return (
    snapshot !== undefined &&
    snapshot.rest.length === rest.length &&
    snapshot.gql.length === gql.length
  )
}

async function readRecovery(userId: string) {
  const result = await Store.get<unknown>(
    COLLECTION_STORE_NAMESPACE,
    recoveryKey(userId)
  )
  if (E.isLeft(result)) return undefined
  const record = result.right as OwnedCollectionRecovery | undefined
  if (!record || record.ownerId !== userId) return undefined
  return snapshotFromValue(record)
}

async function readRevision(key: string) {
  const result = await Store.get<number>(COLLECTION_STORE_NAMESPACE, key)
  if (E.isLeft(result) || typeof result.right !== "number" || result.right <= 0) {
    return undefined
  }
  return result.right
}

async function writeRevision(key: string, revision: number) {
  const result = await Store.set(COLLECTION_STORE_NAMESPACE, key, revision)
  return E.isRight(result)
}

async function appliedRevisionMatches(userId: string, revision: number) {
  const [marker, applied] = await Promise.all([
    readRevision(restoredKey(userId)),
    readRevision(appliedKey(userId)),
  ])
  return marker === revision && applied === revision
}

function sameCollectionLists(left: HoppCollection[], right: HoppCollection[]) {
  return JSON.stringify(left) === JSON.stringify(right)
}

// Writes the lists currently in memory. After logout those are empty unless a
// guest created a collection while the account snapshot was still saving.
async function persistSharedListsFromStore() {
  // Stop the persistence subscribers, including writes already started when
  // logout cleared the lists, so they cannot replace this write afterward.
  await pauseCollectionPersistenceWrites()
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const rest = copyCollections(restCollectionStore.value.state)
      const gql = copyCollections(graphqlCollectionStore.value.state)
      const restSaved = await Store.set(
        COLLECTION_STORE_NAMESPACE,
        SHARED_REST_COLLECTIONS_KEY,
        rest
      )
      const gqlSaved = await Store.set(
        COLLECTION_STORE_NAMESPACE,
        SHARED_GQL_COLLECTIONS_KEY,
        gql
      )
      if (E.isLeft(restSaved) || E.isLeft(gqlSaved)) continue
      const storedRest = await Store.get<HoppCollection[]>(
        COLLECTION_STORE_NAMESPACE,
        SHARED_REST_COLLECTIONS_KEY
      )
      const storedGql = await Store.get<HoppCollection[]>(
        COLLECTION_STORE_NAMESPACE,
        SHARED_GQL_COLLECTIONS_KEY
      )
      if (E.isLeft(storedRest) || E.isLeft(storedGql)) continue
      if (
        sameCollectionLists(rest, storedRest.right ?? []) &&
        sameCollectionLists(gql, storedGql.right ?? []) &&
        sameCollectionLists(rest, restCollectionStore.value.state) &&
        sameCollectionLists(gql, graphqlCollectionStore.value.state)
      ) {
        return true
      }
    }
    return false
  } finally {
    resumeCollectionPersistenceWrites()
  }
}

async function persistAppliedLists(
  userId: string,
  rest: HoppCollection[],
  gql: HoppCollection[],
  revision: number
) {
  if (signedInUserId !== userId) return false
  const restSaved = await Store.set(
    COLLECTION_STORE_NAMESPACE,
    SHARED_REST_COLLECTIONS_KEY,
    rest
  )
  // Logout can clear the shared keys while this write is in flight. Do not
  // start the next write, and put the empty lists back if this one landed.
  if (signedInUserId !== userId) {
    await persistSharedListsFromStore()
    return false
  }
  if (E.isLeft(restSaved)) return false
  const gqlSaved = await Store.set(
    COLLECTION_STORE_NAMESPACE,
    SHARED_GQL_COLLECTIONS_KEY,
    gql
  )
  if (signedInUserId !== userId) {
    await persistSharedListsFromStore()
    return false
  }
  if (E.isLeft(gqlSaved)) return false
  if (!(await writeRevision(appliedKey(userId), revision))) return false
  if (signedInUserId !== userId) return false
  let marked = await writeRevision(restoredKey(userId), revision)
  if (!marked && signedInUserId === userId) {
    marked = await writeRevision(restoredKey(userId), revision)
  }
  if (!marked || signedInUserId !== userId) return false
  forceRestoreUserIds.delete(userId)
  return true
}

async function saveRecovery(
  userId: string,
  rest: HoppCollection[],
  gql: HoppCollection[],
  revision: number
) {
  const saved = await Store.set(
    COLLECTION_STORE_NAMESPACE,
    recoveryKey(userId),
    { ownerId: userId, rest, gql, revision } satisfies OwnedCollectionRecovery
  )
  if (E.isLeft(saved)) return false

  const stored = await readRecovery(userId)
  return (
    stored !== undefined &&
    stored.rest.length === rest.length &&
    stored.gql.length === gql.length
  )
}

async function removeRecovery(userId: string) {
  const removed = await Store.remove(
    COLLECTION_STORE_NAMESPACE,
    recoveryKey(userId)
  )
  return E.isRight(removed)
}

function clearSharedCollectionLists() {
  runDispatchWithOutSyncing(() => {
    setRESTCollections([])
    setGraphqlCollections([])
  })
}

function queueOwnedCollectionSave(
  userId: string,
  rest: HoppCollection[],
  gql: HoppCollection[]
) {
  ownedCollectionSave = ownedCollectionSave
    .catch(() => undefined)
    .then(async () => {
      try {
        // A failed reset must not leave the old marker able to hide this save.
        const revision = nextSnapshotRevision()
        if (await writeRevision(restoredKey(userId), 0)) {
          forceRestoreUserIds.delete(userId)
        } else {
          forceRestoreUserIds.add(userId)
        }
        let saved = false
        try {
          saved = await saveOwnedCollections(userId, rest, gql, revision)
        } catch {
          saved = false
        }
        if (saved) {
          const removed = await removeRecovery(userId)
          const replaced =
            removed || (await saveRecovery(userId, rest, gql, revision))
          if (replaced) memoryRecoveryByOwner.delete(userId)
          else memoryRecoveryByOwner.set(userId, { rest, gql, revision })
          return
        }

        // The shared lists stay cleared. Prefer a disk record the owner can
        // read after a reload. If that write fails too, keep the copy in
        // memory for this session without publishing it to the shared lists.
        let recovered = false
        try {
          recovered = await saveRecovery(userId, rest, gql, revision)
        } catch {
          recovered = false
        }
        if (recovered) {
          memoryRecoveryByOwner.delete(userId)
          return
        }
        memoryRecoveryByOwner.set(userId, { rest, gql, revision })
      } finally {
        // Runs after any restore write queued ahead of this logout. Empty
        // lists replace that stale account data, while a guest collection
        // created after sign-out is written instead of being erased.
        const persisted = await persistSharedListsFromStore()
        if (!persisted) {
          throw new Error(
            "Failed to persist shared collection lists after logout"
          )
        }
      }
    })
    .catch((error: unknown) => {
      console.error(
        "Failed to persist shared collection lists after logout",
        error
      )
    })
}

async function restoreOwnedCollections(userId: string, generation: number) {
  await ownedCollectionSave.catch(() => undefined)
  if (!isActiveCollectionSession(userId, generation)) return

  const saved = newerSnapshot(
    await readOwnedCollections(userId),
    await readRecovery(userId),
    memoryRecoveryByOwner.get(userId)
  )
  if (!isActiveCollectionSession(userId, generation) || !saved) return

  const revision = saved.revision ?? 0
  // Skip only when this exact snapshot was already merged and the shared
  // lists were stored first. A failed logout reset, or a newer memory copy,
  // must still be applied.
  if (
    !forceRestoreUserIds.has(userId) &&
    revision > 0 &&
    (await appliedRevisionMatches(userId, revision))
  ) {
    return
  }
  if (!isActiveCollectionSession(userId, generation)) return

  // Each list is restored on its own. A guest collection in one list must
  // not block the other, and local-only work from the saved copy is merged
  // into whatever is already there.
  const rest = restoreCollectionList(
    restCollectionStore.value.state,
    saved.rest
  )
  const gql = restoreCollectionList(
    graphqlCollectionStore.value.state,
    saved.gql
  )
  if (!isActiveCollectionSession(userId, generation)) return
  runDispatchWithOutSyncing(() => {
    setRESTCollections(rest)
    setGraphqlCollections(gql)
  })
  if (!isActiveCollectionSession(userId, generation) || revision <= 0) return
  // The marker is written only after the shared lists, and only while this
  // account is still signed in. Logout is queued behind this write.
  ownedCollectionSave = ownedCollectionSave
    .catch(() => undefined)
    .then(async () => {
      if (signedInUserId !== userId) return
      await persistAppliedLists(
        userId,
        copyCollections(restCollectionStore.value.state),
        copyCollections(graphqlCollectionStore.value.state),
        revision
      )
    })
}

function initCollectionsSync() {
  const authEvents$ = platform.auth.getAuthEventsStream()
  const currentUser$ = platform.auth.getCurrentUserStream()
  collectionsSyncer.startStoreSync()
  collectionsSyncer.setupSubscriptions(setupSubscriptions)

  gqlCollectionsSyncer.startStoreSync()

  currentUser$.subscribe((user) => {
    if (!user?.uid) return
    // Profile updates emit the same account again. Restoring here would
    // replace collections created since the last logout with that snapshot.
    if (signedInUserId === user.uid) return

    signedInUserId = user.uid
    const generation = ++collectionLoadGeneration
    const userId = user.uid

    void (async () => {
      await restoreOwnedCollections(userId, generation)
      if (!isActiveCollectionSession(userId, generation)) return
      void loadUserCollections("REST")
      void loadUserCollections("GQL")
    })()
  })

  authEvents$.subscribe((event) => {
    if (event.event == "login" || event.event == "token_refresh") {
      collectionsSyncer.startListeningToSubscriptions()
    }

    if (event.event == "logout") {
      const userId = signedInUserId
      const rest = copyCollections(restCollectionStore.value.state)
      const gql = copyCollections(graphqlCollectionStore.value.state)
      collectionLoadGeneration++
      signedInUserId = null
      collectionsSyncer.stopListeningToSubscriptions()

      // Hide this account's lists from the next one immediately. The saved
      // copy is written afterward and is not synced, so the server keeps the
      // account's collections and unsynced local work can be restored.
      clearSharedCollectionLists()
      if (userId) queueOwnedCollectionSave(userId, rest, gql)
    }
  })
}

export type ExportedUserCollectionREST = {
  id?: string
  _ref_id?: string
  folders: ExportedUserCollectionREST[]
  requests: Array<HoppRESTRequest & { id: string }>
  name: string
  data: string
}

export type ExportedUserCollectionGQL = {
  id?: string
  _ref_id?: string
  folders: ExportedUserCollectionGQL[]
  requests: Array<HoppGQLRequest & { id: string }>
  name: string
  data: string
}

function addDescriptionField(
  candidate: HoppRESTHeaders | GQLHeader[] | HoppRESTParam[]
) {
  return candidate.map((item) => ({
    ...item,
    description: "description" in item ? item.description : "",
  }))
}

// Unified collections can hold cross-type requests, so try both schemas before rebuilding.
function normalizeCollectionRequest(
  request: HoppRESTRequest | HoppGQLRequest,
  collectionType: "REST" | "GQL"
): HoppRESTRequest | HoppGQLRequest {
  if (collectionType === "REST") {
    const restParsed = HoppRESTRequest.safeParse(request)
    if (restParsed.type === "ok") return restParsed.value

    if (isGQLRequest(request)) {
      const gqlParsed = HoppGQLRequest.safeParse(request)
      return gqlParsed.type === "ok"
        ? gqlParsed.value
        : (request as HoppGQLRequest)
    }

    const r = request as HoppRESTRequest
    return {
      v: r.v,
      id: r.id,
      name: r.name,
      endpoint: r.endpoint,
      method: r.method,
      params: addDescriptionField(r.params) as HoppRESTParam[],
      requestVariables: r.requestVariables,
      auth: r.auth,
      headers: addDescriptionField(r.headers) as HoppRESTHeaders,
      body: r.body,
      preRequestScript: r.preRequestScript,
      testScript: r.testScript,
      responses: r.responses,
      description: r.description ?? null,
      _ref_id: r._ref_id ?? generateUniqueRefId("req"),
    }
  }

  const gqlParsed = HoppGQLRequest.safeParse(request)
  if (gqlParsed.type === "ok") return gqlParsed.value

  if (!isGQLRequest(request)) {
    const restParsed = HoppRESTRequest.safeParse(request)
    return restParsed.type === "ok"
      ? restParsed.value
      : (request as HoppRESTRequest)
  }

  const g = request as HoppGQLRequest
  return {
    id: g.id,
    v: g.v,
    auth: g.auth,
    headers: addDescriptionField(g.headers) as GQLHeader[],
    name: g.name,
    query: g.query,
    url: g.url,
    variables: g.variables,
    description: g.description ?? null,
    _ref_id: g._ref_id ?? generateUniqueRefId("req"),
    responses: g.responses ?? {},
    preRequestScript: g.preRequestScript ?? "",
    testScript: g.testScript ?? "",
  }
}

export function exportedCollectionToHoppCollection(
  collection: ExportedUserCollectionREST | ExportedUserCollectionGQL,
  collectionType: "REST" | "GQL"
): HoppCollection {
  if (collectionType == "REST") {
    const restCollection = collection as ExportedUserCollectionREST

    const data =
      restCollection.data && restCollection.data !== "null"
        ? JSON.parse(restCollection.data)
        : {
            auth: { authType: "inherit", authActive: true },
            headers: [],
            _ref_id: generateUniqueRefId("coll"),
            variables: [],
            description: null,
          }

    return makeCollection({
      id: restCollection.id,
      _ref_id: data._ref_id ?? generateUniqueRefId("coll"),
      name: restCollection.name,
      folders: restCollection.folders.map((folder) =>
        exportedCollectionToHoppCollection(folder, collectionType)
      ),
      requests: restCollection.requests.map((request) =>
        normalizeCollectionRequest(request, "REST")
      ),
      description: data.description ?? null,
      auth: data.auth,
      headers: addDescriptionField(data.headers),
      variables: data.variables ?? [],
      preRequestScript: data.preRequestScript ?? "",
      testScript: data.testScript ?? "",
    })
  }
  const gqlCollection = collection as ExportedUserCollectionGQL

  const data =
    gqlCollection.data && gqlCollection.data !== "null"
      ? JSON.parse(gqlCollection.data)
      : {
          auth: { authType: "inherit", authActive: true },
          headers: [],
          _ref_id: generateUniqueRefId("coll"),
          variables: [],
          description: null,
        }

  return makeCollection({
    id: gqlCollection.id,
    _ref_id: data._ref_id ?? generateUniqueRefId("coll"),
    name: gqlCollection.name,
    folders: gqlCollection.folders.map((folder) =>
      exportedCollectionToHoppCollection(folder, collectionType)
    ),
    requests: gqlCollection.requests.map((request) =>
      normalizeCollectionRequest(request, "GQL")
    ),
    auth: data.auth,
    headers: addDescriptionField(data.headers),
    variables: data.variables ?? [],
    description: data.description ?? null,
    preRequestScript: data.preRequestScript ?? "",
    testScript: data.testScript ?? "",
  })
}

function mergeTwoCollections(
  local: HoppCollection,
  fetched: HoppCollection,
  serverIdsAtStart: Set<string>
): HoppCollection {
  const mergedFolders: HoppCollection[] = []
  const fetchedFoldersMap = new Map<string, HoppCollection>()
  for (const f of fetched.folders) {
    if (f.id) fetchedFoldersMap.set(f.id, f)
  }

  const processedFetchedFolderIds = new Set<string>()
  for (const localFolder of local.folders) {
    if (localFolder.id) {
      const fetchedFolder = fetchedFoldersMap.get(localFolder.id)
      if (fetchedFolder) {
        mergedFolders.push(
          mergeTwoCollections(localFolder, fetchedFolder, serverIdsAtStart)
        )
        processedFetchedFolderIds.add(localFolder.id)
      } else if (
        keepLocalItemMissingFromExport(localFolder.id, serverIdsAtStart)
      ) {
        mergedFolders.push(localFolder)
      }
    } else {
      mergedFolders.push(localFolder)
    }
  }

  for (const fetchedFolder of fetched.folders) {
    if (fetchedFolder.id && !processedFetchedFolderIds.has(fetchedFolder.id)) {
      mergedFolders.push(fetchedFolder)
    }
  }

  const mergedRequests: typeof fetched.requests = []
  const fetchedRequestsMap = new Map<string, any>()
  for (const r of fetched.requests) {
    if (r.id) fetchedRequestsMap.set(r.id, r)
  }

  const processedFetchedRequestIds = new Set<string>()
  for (const localReq of local.requests) {
    if (localReq.id) {
      const fetchedReq = fetchedRequestsMap.get(localReq.id)
      if (fetchedReq) {
        mergedRequests.push(fetchedReq)
        processedFetchedRequestIds.add(localReq.id)
      } else if (keepLocalItemMissingFromExport(localReq.id, serverIdsAtStart)) {
        mergedRequests.push(localReq)
      }
    } else {
      mergedRequests.push(localReq)
    }
  }

  for (const fetchedReq of fetched.requests) {
    if (fetchedReq.id && !processedFetchedRequestIds.has(fetchedReq.id)) {
      mergedRequests.push(fetchedReq)
    }
  }

  return {
    ...fetched,
    folders: mergedFolders,
    requests: mergedRequests,
  }
}

function mergeCollections(
  localCollections: HoppCollection[],
  fetchedCollections: HoppCollection[],
  serverIdsAtStart: Set<string>
): HoppCollection[] {
  const fetchedMap = new Map<string, HoppCollection>()
  for (const col of fetchedCollections) {
    if (col.id) {
      fetchedMap.set(col.id, col)
    }
  }

  const merged: HoppCollection[] = []
  const processedFetchedIds = new Set<string>()

  for (const localCol of localCollections) {
    if (localCol.id) {
      const fetchedCol = fetchedMap.get(localCol.id)
      if (fetchedCol) {
        merged.push(
          mergeTwoCollections(localCol, fetchedCol, serverIdsAtStart)
        )
        processedFetchedIds.add(localCol.id)
      } else if (keepLocalItemMissingFromExport(localCol.id, serverIdsAtStart)) {
        merged.push(localCol)
      }
    } else {
      merged.push(localCol)
    }
  }

  for (const fetchedCol of fetchedCollections) {
    if (fetchedCol.id && !processedFetchedIds.has(fetchedCol.id)) {
      merged.push(fetchedCol)
    }
  }

  return merged
}

async function loadUserCollections(collectionType: "REST" | "GQL") {
  const userId = signedInUserId
  const generation = collectionLoadGeneration
  if (!userId) return

  // Ids already on the server when this export starts. Anything assigned
  // after this point must survive a response that does not contain it yet.
  const serverIdsAtStart = collectServerBackedIds(
    collectionType == "REST"
      ? restCollectionStore.value.state
      : graphqlCollectionStore.value.state
  )

  const res = await exportUserCollectionsToJSON(
    undefined,
    collectionType == "REST" ? ReqType.Rest : ReqType.Gql
  )
  // The account may have signed out, or another account signed in, while this
  // export was in flight. Drop the response so it cannot refill the store.
  if (!isActiveCollectionSession(userId, generation)) return
  if (E.isRight(res)) {
    const collectionsJSONString =
      res.right.exportUserCollectionsToJSON.exportedCollection
    const exportedCollections = (
      JSON.parse(collectionsJSONString) as Array<
        ExportedUserCollectionGQL | ExportedUserCollectionREST
      >
    ).map((collection) => ({ v: 1, ...collection }))

    const fetchedCollections = exportedCollections.map(
      (collection) =>
        exportedCollectionToHoppCollection(
          collection,
          collectionType
        ) as HoppCollection
    )

    const localCollections =
      collectionType == "REST"
        ? restCollectionStore.value.state
        : graphqlCollectionStore.value.state

    const mergedCollections = mergeCollections(
      localCollections,
      fetchedCollections,
      serverIdsAtStart
    )

    runDispatchWithOutSyncing(() => {
      collectionType == "REST"
        ? setRESTCollections(mergedCollections)
        : setGraphqlCollections(mergedCollections)
    })
  }
}

function setupSubscriptions() {
  let subs: ReturnType<typeof runGQLSubscription>[1][] = []

  const userCollectionCreatedSub = setupUserCollectionCreatedSubscription()
  const userCollectionUpdatedSub = setupUserCollectionUpdatedSubscription()
  const userCollectionRemovedSub = setupUserCollectionRemovedSubscription()
  const userCollectionMovedSub = setupUserCollectionMovedSubscription()
  const userCollectionOrderUpdatedSub =
    setupUserCollectionOrderUpdatedSubscription()
  const userCollectionDuplicatedSub =
    setupUserCollectionDuplicatedSubscription()
  const userRootCollectionsSortedSub =
    setupUserRootCollectionsSortedSubscription()
  const userChildCollectionSortedSub =
    setupUserChildCollectionSortedSubscription()

  const userRequestCreatedSub = setupUserRequestCreatedSubscription()
  const userRequestUpdatedSub = setupUserRequestUpdatedSubscription()
  const userRequestDeletedSub = setupUserRequestDeletedSubscription()
  const userRequestMovedSub = setupUserRequestMovedSubscription()

  subs = [
    userCollectionCreatedSub,
    userCollectionUpdatedSub,
    userCollectionRemovedSub,
    userCollectionMovedSub,
    userCollectionOrderUpdatedSub,
    userCollectionDuplicatedSub,
    userRootCollectionsSortedSub,
    userChildCollectionSortedSub,
    userRequestCreatedSub,
    userRequestUpdatedSub,
    userRequestDeletedSub,
    userRequestMovedSub,
  ]

  return () => {
    subs.forEach((sub) => sub.unsubscribe())
  }
}

function setupUserCollectionCreatedSubscription() {
  const [userCollectionCreated$, userCollectionCreatedSub] =
    runUserCollectionCreatedSubscription()

  userCollectionCreated$.subscribe((res) => {
    if (E.isRight(res)) {
      const collectionType = res.right.userCollectionCreated.type

      const { collectionStore } = getStoreByCollectionType(collectionType)

      const userCollectionBackendID = res.right.userCollectionCreated.id
      const parentCollectionID = res.right.userCollectionCreated.parent?.id

      const userCollectionLocalID = getCollectionPathFromCollectionID(
        userCollectionBackendID,
        collectionStore.value.state
      )

      // collection already exists in store ( this instance created it )
      if (userCollectionLocalID) {
        return
      }

      const parentCollectionPath =
        parentCollectionID &&
        getCollectionPathFromCollectionID(
          parentCollectionID,
          collectionStore.value.state
        )

      // only folders will have parent collection id
      if (parentCollectionID && parentCollectionPath) {
        runDispatchWithOutSyncing(() => {
          collectionType == "GQL"
            ? addGraphqlFolder(
                res.right.userCollectionCreated.title,
                parentCollectionPath
              )
            : addRESTFolder(
                res.right.userCollectionCreated.title,
                parentCollectionPath
              )

          const parentCollection = navigateToFolderWithIndexPath(
            collectionStore.value.state,
            parentCollectionPath
              .split("/")
              .map((pathIndex) => parseInt(pathIndex))
          )

          if (parentCollection) {
            const folderIndex = parentCollection.folders.length - 1

            const addedFolder = parentCollection.folders[folderIndex]
            addedFolder.id = userCollectionBackendID
          }
        })
      } else {
        // root collections won't have parentCollectionID
        const data =
          res.right.userCollectionCreated.data &&
          res.right.userCollectionCreated.data != "null"
            ? JSON.parse(res.right.userCollectionCreated.data)
            : {
                auth: { authType: "inherit", authActive: true },
                headers: [],
                _ref_id: generateUniqueRefId("coll"),
                variables: [],
                description: null,
              }

        runDispatchWithOutSyncing(() => {
          collectionType == "GQL"
            ? addGraphqlCollection(
                makeCollection({
                  name: res.right.userCollectionCreated.title,
                  folders: [],
                  requests: [],
                  _ref_id: data._ref_id,
                  auth: data.auth,
                  headers: addDescriptionField(data.headers),
                  variables: data.variables ?? [],
                  description: data.description ?? null,
                  preRequestScript: data.preRequestScript ?? "",
                  testScript: data.testScript ?? "",
                })
              )
            : addRESTCollection(
                makeCollection({
                  name: res.right.userCollectionCreated.title,
                  folders: [],
                  requests: [],
                  _ref_id: data._ref_id,
                  auth: data.auth,
                  headers: addDescriptionField(data.headers),
                  variables: data.variables ?? [],
                  description: data.description ?? null,
                  preRequestScript: data.preRequestScript ?? "",
                  testScript: data.testScript ?? "",
                })
              )

          const localIndex = collectionStore.value.state.length - 1

          const addedCollection = collectionStore.value.state[localIndex]
          addedCollection.id = userCollectionBackendID
        })
      }
    }
  })

  return userCollectionCreatedSub
}

function setupUserCollectionUpdatedSubscription() {
  const [userCollectionUpdated$, userCollectionUpdatedSub] =
    runUserCollectionUpdatedSubscription()

  userCollectionUpdated$.subscribe((res) => {
    if (E.isRight(res)) {
      const {
        id: updatedCollectionBackendID,
        title,
        type: collectionType,
        data,
      } = res.right.userCollectionUpdated

      const { collectionStore } = getStoreByCollectionType(collectionType)

      const updatedCollectionLocalPath = getCollectionPathFromCollectionID(
        updatedCollectionBackendID,
        collectionStore.value.state
      )

      if (!updatedCollectionLocalPath) return

      const isFolder = updatedCollectionLocalPath.split("/").length > 1

      // Carry auth, headers, variables, and scripts from the data payload
      const {
        auth,
        headers,
        variables,
        description,
        preRequestScript,
        testScript,
      } =
        data && data != "null"
          ? JSON.parse(data)
          : {
              auth: { authType: "inherit", authActive: true },
              headers: [],
              variables: [],
              description: null,
              preRequestScript: "",
              testScript: "",
            }

      const partialUpdate: Partial<HoppCollection> = {
        name: title,
        auth,
        headers: addDescriptionField(headers),
        variables: variables ?? [],
        description: description ?? null,
        preRequestScript: preRequestScript ?? "",
        testScript: testScript ?? "",
      }

      runDispatchWithOutSyncing(() => {
        if (isFolder) {
          collectionType == "REST"
            ? editRESTFolder(updatedCollectionLocalPath, partialUpdate)
            : editGraphqlFolder(updatedCollectionLocalPath, partialUpdate)
        } else {
          collectionType == "REST"
            ? editRESTCollection(
                parseInt(updatedCollectionLocalPath),
                partialUpdate
              )
            : editGraphqlCollection(
                parseInt(updatedCollectionLocalPath),
                partialUpdate
              )
        }
      })
    }
  })

  return userCollectionUpdatedSub
}

function setupUserCollectionMovedSubscription() {
  const [userCollectionMoved$, userCollectionMovedSub] =
    runUserCollectionMovedSubscription()

  userCollectionMoved$.subscribe((res) => {
    if (E.isRight(res)) {
      const movedMetadata = res.right.userCollectionMoved
      const collectionType = movedMetadata.type

      const { collectionStore } = getStoreByCollectionType(collectionType)

      const sourcePath = getCollectionPathFromCollectionID(
        movedMetadata.id,
        collectionStore.value.state
      )

      let destinationPath: string | undefined

      if (movedMetadata.parent?.id) {
        destinationPath =
          getCollectionPathFromCollectionID(
            movedMetadata.parent?.id,
            collectionStore.value.state
          ) ?? undefined
      }

      sourcePath &&
        runDispatchWithOutSyncing(() => {
          collectionType === "GQL"
            ? moveGraphqlFolder(sourcePath, destinationPath ?? null)
            : moveRESTFolder(sourcePath, destinationPath ?? null)
        })
    }
  })

  return userCollectionMovedSub
}

function setupUserCollectionRemovedSubscription() {
  const [userCollectionRemoved$, userCollectionRemovedSub] =
    runUserCollectionRemovedSubscription()

  userCollectionRemoved$.subscribe((res) => {
    if (E.isRight(res)) {
      const removedCollectionBackendID = res.right.userCollectionRemoved.id
      const collectionType = res.right.userCollectionRemoved.type

      const { collectionStore } = getStoreByCollectionType(collectionType)

      const removedCollectionLocalPath = getCollectionPathFromCollectionID(
        removedCollectionBackendID,
        collectionStore.value.state
      )

      const isFolder =
        removedCollectionLocalPath &&
        removedCollectionLocalPath.split("/").length > 1

      if (removedCollectionLocalPath && isFolder) {
        runDispatchWithOutSyncing(() => {
          collectionType == "REST"
            ? removeRESTFolder(removedCollectionLocalPath)
            : removeGraphqlFolder(removedCollectionLocalPath)
        })
      }

      if (removedCollectionLocalPath && !isFolder) {
        runDispatchWithOutSyncing(() => {
          collectionType == "REST"
            ? removeRESTCollection(parseInt(removedCollectionLocalPath))
            : removeGraphqlCollection(parseInt(removedCollectionLocalPath))
        })
      }
    }
  })

  return userCollectionRemovedSub
}

function setupUserCollectionOrderUpdatedSubscription() {
  const [userCollectionOrderUpdated$, userCollectionOrderUpdatedSub] =
    runUserCollectionOrderUpdatedSubscription()

  userCollectionOrderUpdated$.subscribe((res) => {
    if (E.isRight(res)) {
      const { userCollection, nextUserCollection } =
        res.right.userCollectionOrderUpdated

      const sourceCollectionID = userCollection.id
      const destinationCollectionID = nextUserCollection?.id

      // The OrderUpdated payload does not include a `type` field, so
      // determine which store owns the source ID by lookup.
      const collectionType = locateCollectionType(sourceCollectionID)
      if (!collectionType) return

      const { collectionStore } = getStoreByCollectionType(collectionType)

      const sourcePath = getCollectionPathFromCollectionID(
        sourceCollectionID,
        collectionStore.value.state
      )

      let destinationPath: string | null | undefined

      if (destinationCollectionID) {
        destinationPath = getCollectionPathFromCollectionID(
          destinationCollectionID,
          collectionStore.value.state
        )
      }

      runDispatchWithOutSyncing(() => {
        if (sourcePath) {
          collectionType === "GQL"
            ? updateGraphqlCollectionOrder(sourcePath, destinationPath ?? null)
            : updateRESTCollectionOrder(sourcePath, destinationPath ?? null)
        }
      })
    }
  })

  return userCollectionOrderUpdatedSub
}

function setupUserCollectionDuplicatedSubscription() {
  const [userCollectionDuplicated$, userCollectionDuplicatedSub] =
    runUserCollectionDuplicatedSubscription()

  userCollectionDuplicated$.subscribe((res) => {
    if (E.isRight(res)) {
      const {
        childCollections: childCollectionsJSONStr,
        data,
        id,
        parentID: parentCollectionID,
        requests: userRequests,
        title: name,
        type: collectionType,
      } = res.right.userCollectionDuplicated

      const { collectionStore } = getStoreByCollectionType(collectionType)

      const duplicatedCollectionAlreadyApplied =
        getCollectionPathFromCollectionID(id, collectionStore.value.state)

      if (duplicatedCollectionAlreadyApplied) {
        return
      }

      const parentCollectionPath =
        parentCollectionID &&
        getCollectionPathFromCollectionID(
          parentCollectionID,
          collectionStore.value.state
        )

      // Incoming data transformed to the respective internal representations
      const {
        auth,
        headers,
        variables,
        description,
        preRequestScript,
        testScript,
      } =
        data && data != "null"
          ? JSON.parse(data)
          : {
              auth: { authType: "inherit", authActive: true },
              headers: [],
              variables: [],
              description: null,
              preRequestScript: "",
              testScript: "",
            }
      // Duplicated collection will have a unique ref id
      const _ref_id = generateUniqueRefId("coll")

      const folders = transformDuplicatedCollections(
        childCollectionsJSONStr,
        collectionType
      )

      const requests = transformDuplicatedCollectionRequests(
        userRequests as UserRequest[],
        collectionType
      )

      // New collection to be added to store with the transformed data
      const effectiveDuplicatedCollection: HoppCollection = makeCollection({
        id,
        name,
        folders,
        requests,
        _ref_id,
        auth,
        headers: addDescriptionField(headers),
        variables: variables ?? [],
        description: description ?? null,
        preRequestScript: preRequestScript ?? "",
        testScript: testScript ?? "",
      })

      // only folders will have parent collection id
      if (parentCollectionID && parentCollectionPath) {
        const collectionCreatedFromStoreIDSuffix = "-duplicate-collection"

        const parentCollection = navigateToFolderWithIndexPath(
          collectionStore.value.state,
          parentCollectionPath
            .split("/")
            .map((pathIndex) => parseInt(pathIndex))
        )

        if (!parentCollection) {
          return
        }

        // Grab the child collection inserted via store update with the ID suffix
        const collectionInsertedViaStoreUpdateIdx =
          parentCollection.folders.findIndex(({ id }) =>
            id?.endsWith(collectionCreatedFromStoreIDSuffix)
          )

        runDispatchWithOutSyncing(() => {
          if (collectionInsertedViaStoreUpdateIdx === -1) {
            // Cross-device duplicate: no local placeholder to remove, just add it
            const newFolderPath = `${parentCollectionPath}/${parentCollection.folders.length}`

            if (collectionType === "GQL") {
              addGraphqlFolder(name, parentCollectionPath)
              editGraphqlFolder(newFolderPath, effectiveDuplicatedCollection)
            } else {
              addRESTFolder(name, parentCollectionPath)
              editRESTFolder(newFolderPath, effectiveDuplicatedCollection)
            }
          } else {
            const collectionInsertedViaStoreUpdateIndexPath = `${parentCollectionPath}/${collectionInsertedViaStoreUpdateIdx}`
            // After remove + append, the new folder sits at the last index;
            // editing the placeholder path now would hit a shifted sibling.
            const newFolderPath = `${parentCollectionPath}/${parentCollection.folders.length - 1}`

            if (collectionType === "GQL") {
              removeGraphqlFolder(collectionInsertedViaStoreUpdateIndexPath)
              addGraphqlFolder(name, parentCollectionPath)
              editGraphqlFolder(newFolderPath, effectiveDuplicatedCollection)
            } else {
              removeRESTFolder(collectionInsertedViaStoreUpdateIndexPath)
              addRESTFolder(name, parentCollectionPath)
              editRESTFolder(newFolderPath, effectiveDuplicatedCollection)
            }
          }
        })
      } else {
        // root collections won't have `parentCollectionID`
        const collectionCreatedFromStoreIDSuffix = "-duplicate-collection"

        // Grab the child collection inserted via store update with the ID suffix
        const collectionInsertedViaStoreUpdateIdx =
          collectionStore.value.state.findIndex(({ id }) =>
            id?.endsWith(collectionCreatedFromStoreIDSuffix)
          )

        runDispatchWithOutSyncing(() => {
          if (collectionInsertedViaStoreUpdateIdx === -1) {
            if (collectionType === "GQL") {
              addGraphqlCollection(effectiveDuplicatedCollection)
            } else {
              addRESTCollection(effectiveDuplicatedCollection)
            }
          } else {
            if (collectionType === "GQL") {
              removeGraphqlCollection(collectionInsertedViaStoreUpdateIdx)
              addGraphqlCollection(effectiveDuplicatedCollection)
            } else {
              removeRESTCollection(collectionInsertedViaStoreUpdateIdx)
              addRESTCollection(effectiveDuplicatedCollection)
            }
          }
        })
      }
    }
  })

  return userCollectionDuplicatedSub
}

const setupUserRootCollectionsSortedSubscription = () => {
  const [userRootCollectionsSorted$, userRootCollectionsSortedSub] =
    runUserRootCollectionsSortedSubscription()

  userRootCollectionsSorted$.subscribe((res) => {
    if (E.isRight(res)) {
      runDispatchWithOutSyncing(() => {
        if (res.right.userRootCollectionsSorted) {
          const { sortOption } = res.right.userRootCollectionsSorted

          const sortOrder = sortOption === "TITLE_ASC" ? "asc" : "desc"

          // TODO: UserCollectionSortData does not carry a REST/GQL type
          // discriminator, so we can't route a root-level sort event to the
          // correct store. Apply to whichever store is non-empty; if both
          // are populated this will be ambiguous — needs a backend schema
          // change to add `type` to UserCollectionSortData.
          const restHasState = restCollectionStore.value.state.length > 0
          const gqlHasState = graphqlCollectionStore.value.state.length > 0

          if (restHasState && !gqlHasState) {
            sortRESTCollection(null, sortOrder)
          } else if (gqlHasState && !restHasState) {
            sortGraphqlCollection(null, sortOrder)
          } else {
            // Ambiguous (both or neither store has state): skip until backend
            // includes a type discriminator in UserCollectionSortData.
            return
          }
        }
      })
    }
  })
  return userRootCollectionsSortedSub
}

const setupUserChildCollectionSortedSubscription = () => {
  const [userChildCollectionSorted$, userChildCollectionSortedSub] =
    runUserChildCollectionSortedSubscription()

  userChildCollectionSorted$.subscribe((res) => {
    if (E.isRight(res)) {
      runDispatchWithOutSyncing(() => {
        if (res.right.userChildCollectionsSorted) {
          const { parentCollectionID, sortOption } =
            res.right.userChildCollectionsSorted

          if (!parentCollectionID) return

          const sortOrder = sortOption === "TITLE_ASC" ? "asc" : "desc"

          // ChildCollectionSorted payload does not include a `type` field,
          // so resolve store membership from the parent ID.
          const collectionType = locateCollectionType(parentCollectionID)
          if (!collectionType) return

          const { collectionStore } = getStoreByCollectionType(collectionType)

          const sourcePath = getCollectionPathFromCollectionID(
            parentCollectionID,
            collectionStore.value.state
          )

          if (!sourcePath) return

          collectionType === "GQL"
            ? sortGraphqlFolder(sourcePath, sortOrder)
            : sortRESTFolder(sourcePath, sortOrder)
        }
      })
    }
  })
  return userChildCollectionSortedSub
}

function setupUserRequestCreatedSubscription() {
  const [userRequestCreated$, userRequestCreatedSub] =
    runUserRequestCreatedSubscription()

  userRequestCreated$.subscribe((res) => {
    if (E.isRight(res)) {
      const collectionID = res.right.userRequestCreated.collectionID
      const requestType = res.right.userRequestCreated.type
      const request = normalizeCollectionRequest(
        JSON.parse(res.right.userRequestCreated.request),
        requestType
      )
      const requestID = res.right.userRequestCreated.id

      const { collectionStore } = getStoreByCollectionType(requestType)

      const hasAlreadyHappened = getRequestPathFromRequestID(
        requestID,
        collectionStore.value.state
      )

      if (!!hasAlreadyHappened) {
        return
      }

      const collectionPath = getCollectionPathFromCollectionID(
        collectionID,
        collectionStore.value.state
      )

      if (collectionID && collectionPath) {
        runDispatchWithOutSyncing(() => {
          requestType == "REST"
            ? saveRESTRequestAs(collectionPath, request)
            : saveGraphqlRequestAs(collectionPath, request as HoppGQLRequest)

          const target = navigateToFolderWithIndexPath(
            collectionStore.value.state,
            collectionPath.split("/").map((index) => parseInt(index))
          )

          const targetRequest = target?.requests[target?.requests.length - 1]

          if (targetRequest) {
            targetRequest.id = requestID
          }
        })
      }
    }
  })

  return userRequestCreatedSub
}

function setupUserRequestUpdatedSubscription() {
  const [userRequestUpdated$, userRequestUpdatedSub] =
    runUserRequestUpdatedSubscription()

  userRequestUpdated$.subscribe((res) => {
    if (E.isRight(res)) {
      const requestType = res.right.userRequestUpdated.type

      const { collectionStore } = getStoreByCollectionType(requestType)

      const requestPath = getRequestPathFromRequestID(
        res.right.userRequestUpdated.id,
        collectionStore.value.state
      )

      const collectionPath = requestPath?.collectionPath
      const requestIndex = requestPath?.requestIndex

      const updatedRequest = normalizeCollectionRequest(
        JSON.parse(res.right.userRequestUpdated.request),
        requestType
      )

      ;(requestIndex || requestIndex == 0) &&
        collectionPath &&
        runDispatchWithOutSyncing(() => {
          requestType == "REST"
            ? editRESTRequest(collectionPath, requestIndex, updatedRequest)
            : editGraphqlRequest(
                collectionPath,
                requestIndex,
                updatedRequest as HoppGQLRequest
              )
        })
    }
  })

  return userRequestUpdatedSub
}

function setupUserRequestMovedSubscription() {
  const [userRequestMoved$, userRequestMovedSub] =
    runUserRequestMovedSubscription()

  userRequestMoved$.subscribe((res) => {
    if (E.isRight(res)) {
      const { request, nextRequest } = res.right.userRequestMoved

      const {
        collectionID: destinationCollectionID,
        id: sourceRequestID,
        type: requestType,
      } = request

      const { collectionStore } = getStoreByCollectionType(requestType)

      const sourceRequestPath = getRequestPathFromRequestID(
        sourceRequestID,
        collectionStore.value.state
      )

      const destinationCollectionPath = getCollectionPathFromCollectionID(
        destinationCollectionID,
        collectionStore.value.state
      )

      const destinationRequestIndex = destinationCollectionPath
        ? (() => {
            const requestsLength = navigateToFolderWithIndexPath(
              collectionStore.value.state,
              destinationCollectionPath
                .split("/")
                .map((index) => parseInt(index))
            )?.requests.length

            return requestsLength || requestsLength == 0
              ? requestsLength - 1
              : undefined
          })()
        : undefined

      // there is no nextRequest, so request is moved
      if (destinationCollectionPath && sourceRequestPath && !nextRequest) {
        runDispatchWithOutSyncing(() => {
          requestType == "REST"
            ? moveRESTRequest(
                sourceRequestPath.collectionPath,
                sourceRequestPath.requestIndex,
                destinationCollectionPath
              )
            : moveGraphqlRequest(
                sourceRequestPath.collectionPath,
                sourceRequestPath.requestIndex,
                destinationCollectionPath
              )
        })
      }

      // there is nextRequest, so request is reordered
      if (
        destinationRequestIndex != null &&
        destinationRequestIndex >= 0 &&
        destinationCollectionPath &&
        nextRequest &&
        // we don't have request reordering for graphql yet
        requestType == "REST"
      ) {
        const { collectionID: nextCollectionID, id: nextRequestID } =
          nextRequest

        const nextCollectionPath =
          getCollectionPathFromCollectionID(
            nextCollectionID,
            collectionStore.value.state
          ) ?? undefined

        const nextRequestIndex = nextCollectionPath
          ? getRequestIndex(
              nextRequestID,
              nextCollectionPath,
              collectionStore.value.state
            )
          : undefined

        // `!== undefined` (not truthy) so cross-tab reorders to position 0
        // still dispatch; `!== -1` guards a getRequestIndex findIndex miss.
        nextRequestIndex !== undefined &&
          nextCollectionPath &&
          sourceRequestPath &&
          runDispatchWithOutSyncing(() => {
            updateRESTRequestOrder(
              sourceRequestPath?.requestIndex,
              nextRequestIndex,
              nextCollectionPath
            )
          })
      }
    }
  })

  return userRequestMovedSub
}

function setupUserRequestDeletedSubscription() {
  const [userRequestDeleted$, userRequestDeletedSub] =
    runUserRequestDeletedSubscription()

  userRequestDeleted$.subscribe((res) => {
    if (E.isRight(res)) {
      const requestType = res.right.userRequestDeleted.type

      const { collectionStore } = getStoreByCollectionType(requestType)

      const deletedRequestPath = getRequestPathFromRequestID(
        res.right.userRequestDeleted.id,
        collectionStore.value.state
      )

      ;(deletedRequestPath?.requestIndex ||
        deletedRequestPath?.requestIndex == 0) &&
        deletedRequestPath.collectionPath &&
        runDispatchWithOutSyncing(() => {
          requestType == "REST"
            ? removeRESTRequest(
                deletedRequestPath.collectionPath,
                deletedRequestPath.requestIndex
              )
            : removeGraphqlRequest(
                deletedRequestPath.collectionPath,
                deletedRequestPath.requestIndex
              )
        })
    }
  })

  return userRequestDeletedSub
}

export const def: CollectionsPlatformDef = {
  initCollectionsSync,
  loadUserCollections,
  importToPersonalWorkspace,
}

function getCollectionPathFromCollectionID(
  collectionID: string,
  collections: HoppCollection[],
  parentPath?: string
): string | null {
  for (const collectionIndex in collections) {
    if (collections[collectionIndex].id == collectionID) {
      return parentPath
        ? `${parentPath}/${collectionIndex}`
        : `${collectionIndex}`
    }
    const collectionPath = getCollectionPathFromCollectionID(
      collectionID,
      collections[collectionIndex].folders,
      parentPath ? `${parentPath}/${collectionIndex}` : `${collectionIndex}`
    )

    if (collectionPath) return collectionPath
  }

  return null
}

function getRequestPathFromRequestID(
  requestID: string,
  collections: HoppCollection[],
  parentPath?: string
): { collectionPath: string; requestIndex: number } | null {
  for (const collectionIndex in collections) {
    const requestIndex = collections[collectionIndex].requests.findIndex(
      (request) => request.id == requestID
    )

    if (requestIndex != -1) {
      return {
        collectionPath: parentPath
          ? `${parentPath}/${collectionIndex}`
          : `${collectionIndex}`,
        requestIndex,
      }
    }
    const requestPath = getRequestPathFromRequestID(
      requestID,
      collections[collectionIndex].folders,
      parentPath ? `${parentPath}/${collectionIndex}` : `${collectionIndex}`
    )

    if (requestPath) return requestPath
  }

  return null
}

// Resolves whether a collection ID belongs to the REST or GQL store. Returns
// null if neither store contains it (e.g. event for a workspace not loaded
// yet). Used to disambiguate subscription payloads that don't carry a `type`.
function locateCollectionType(collectionID: string): "REST" | "GQL" | null {
  if (
    getCollectionPathFromCollectionID(
      collectionID,
      restCollectionStore.value.state
    )
  ) {
    return "REST"
  }
  if (
    getCollectionPathFromCollectionID(
      collectionID,
      graphqlCollectionStore.value.state
    )
  ) {
    return "GQL"
  }
  return null
}

function getRequestIndex(
  requestID: string,
  parentCollectionPath: string,
  collections: HoppCollection[]
) {
  const collection = navigateToFolderWithIndexPath(
    collections,
    parentCollectionPath?.split("/").map((index) => parseInt(index))
  )

  const requestIndex = collection?.requests.findIndex(
    (request) => request.id == requestID
  )

  return requestIndex
}

function transformDuplicatedCollections(
  collectionsJSONStr: string,
  collectionType: "REST" | "GQL"
): HoppCollection[] {
  const parsedCollections: UserCollectionDuplicatedData[] =
    JSON.parse(collectionsJSONStr)

  return parsedCollections.map(
    ({
      childCollections: childCollectionsJSONStr,
      data,
      id,
      requests: userRequests,
      title: name,
    }) => {
      const {
        auth,
        headers,
        variables,
        description,
        preRequestScript,
        testScript,
      } =
        data && data !== "null"
          ? JSON.parse(data)
          : {
              auth: { authType: "inherit", authActive: true },
              headers: [],
              variables: [],
              description: null,
              preRequestScript: "",
              testScript: "",
            }

      const _ref_id = generateUniqueRefId("coll")

      const folders = transformDuplicatedCollections(
        childCollectionsJSONStr,
        collectionType
      )

      const requests = transformDuplicatedCollectionRequests(
        userRequests,
        collectionType
      )

      return makeCollection({
        id,
        name,
        folders,
        requests,
        _ref_id,
        auth,
        headers: addDescriptionField(headers),
        variables: variables ?? [],
        description: description ?? null,
        preRequestScript: preRequestScript ?? "",
        testScript: testScript ?? "",
      })
    }
  )
}

function transformDuplicatedCollectionRequests(
  requests: UserRequest[],
  collectionType: "REST" | "GQL"
): HoppRESTRequest[] | HoppGQLRequest[] {
  return requests.map(({ id, request }) => {
    const normalized = normalizeCollectionRequest(
      JSON.parse(request),
      collectionType
    )

    return {
      ...normalized,
      id,
    }
  }) as HoppRESTRequest[] | HoppGQLRequest[]
}
