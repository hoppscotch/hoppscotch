import {
  restHistoryStore,
  RESTHistoryEntry,
  setRESTHistoryEntries,
  addRESTHistoryEntry,
  toggleRESTHistoryEntryStar,
  deleteRESTHistoryEntry,
  clearRESTHistory,
  setGraphqlHistoryEntries,
  GQLHistoryEntry,
  addGraphqlHistoryEntry,
  toggleGraphqlHistoryEntryStar,
  graphqlHistoryStore,
  deleteGraphqlHistoryEntry,
  clearGraphqlHistory,
  decodeGQLHistoryResponse,
} from "~/newstore/history"
import { translateToNewRequest, translateToGQLRequest } from "@hoppscotch/data"
import { HistoryPlatformDef } from "~/platform/history"
import {
  getUserHistoryEntries,
  runUserHistoryAllDeletedSubscription,
  runUserHistoryCreatedSubscription,
  runUserHistoryDeletedManySubscription,
  runUserHistoryDeletedSubscription,
  runUserHistoryUpdatedSubscription,
} from "./api"

import * as E from "fp-ts/Either"
import { restHistorySyncer, gqlHistorySyncer } from "./sync"
import { runDispatchWithOutSyncing } from ".."
import { ReqType } from "~/helpers/backend/graphql"
import { ref } from "vue"
import { platform } from "~/platform"

function initHistorySync() {
  const authEvents$ = platform.auth.getAuthEventsStream()
  const currentUser$ = platform.auth.getCurrentUserStream()

  restHistorySyncer.startStoreSync()
  restHistorySyncer.setupSubscriptions(setupSubscriptions)

  gqlHistorySyncer.startStoreSync()

  currentUser$.subscribe(async (user) => {
    getUserHistoryStatus()

    if (user) {
      await loadHistoryEntries()
    }
  })

  authEvents$.subscribe((event) => {
    if (event.event == "login" || event.event == "token_refresh") {
      restHistorySyncer.startListeningToSubscriptions()
    }

    if (event.event == "logout") {
      restHistorySyncer.stopListeningToSubscriptions()
    }
  })
}

function setupSubscriptions() {
  let subs: { unsubscribe: () => void }[] = []

  const userHistoryCreatedSub = setupUserHistoryCreatedSubscription()
  const userHistoryUpdatedSub = setupUserHistoryUpdatedSubscription()
  const userHistoryDeletedSub = setupUserHistoryDeletedSubscription()
  const userHistoryDeletedManySub = setupUserHistoryDeletedManySubscription()
  const userHistoryStoreStatusChangedSub =
    setupUserHistoryStoreStatusChangedSubscription()
  const userHistoryAllDeletedSub = setupUserHistoryAllDeletedSubscription()

  subs = [
    userHistoryCreatedSub,
    userHistoryUpdatedSub,
    userHistoryDeletedSub,
    userHistoryDeletedManySub,
    userHistoryStoreStatusChangedSub,
    userHistoryAllDeletedSub,
  ]

  return () => {
    subs.forEach((sub) => sub.unsubscribe())
  }
}

async function loadHistoryEntries() {
  const res = await getUserHistoryEntries()

  if (E.isRight(res)) {
    const restEntries = res.right.me.RESTHistory
    const gqlEntries = res.right.me.GQLHistory

    const restHistoryEntries: RESTHistoryEntry[] = restEntries.map((entry) => ({
      v: 1,
      request: translateToNewRequest(JSON.parse(entry.request)),
      responseMeta: JSON.parse(entry.responseMetadata),
      star: entry.isStarred,
      updatedOn: new Date(entry.executedOn),
      id: entry.id,
    }))

    const gqlHistoryEntries: GQLHistoryEntry[] = gqlEntries.map((entry) => ({
      v: 1,
      request: translateToGQLRequest(JSON.parse(entry.request)),
      response: decodeGQLHistoryResponse(entry.responseMetadata),
      star: entry.isStarred,
      updatedOn: new Date(entry.executedOn),
      id: entry.id,
    }))

    runDispatchWithOutSyncing(() => {
      setRESTHistoryEntries(restHistoryEntries)
      setGraphqlHistoryEntries(gqlHistoryEntries)
    })
  }
}

async function getUserHistoryStatus() {
  const currentUser = platform.auth.getCurrentUser()

  if (!currentUser) {
    isHistoryStoreEnabled.value = true
    return
  }

  // The history-enabled toggle is a self-host infra-config concept. Backends
  // without it (e.g. cloud) omit this hook and history is always enabled.
  const getHistoryStoreStatus = platform.sync?.history?.getHistoryStoreStatus
  if (!getHistoryStoreStatus) {
    isHistoryStoreEnabled.value = true
    return
  }

  isFetchingHistoryStoreStatus.value = true

  try {
    isHistoryStoreEnabled.value = await getHistoryStoreStatus()
  } catch {
    hasErrorFetchingHistoryStoreStatus.value = true
  } finally {
    isFetchingHistoryStoreStatus.value = false
  }
}

function setupUserHistoryCreatedSubscription() {
  const [userHistoryCreated$, userHistoryCreatedSub] =
    runUserHistoryCreatedSubscription()

  userHistoryCreated$.subscribe((res) => {
    if (E.isRight(res)) {
      const { id, reqType, request, responseMetadata, isStarred, executedOn } =
        res.right.userHistoryCreated

      const hasAlreadyBeenAdded =
        reqType == ReqType.Rest
          ? restHistoryStore.value.state.some((entry) => entry.id == id)
          : graphqlHistoryStore.value.state.some((entry) => entry.id == id)

      !hasAlreadyBeenAdded &&
        runDispatchWithOutSyncing(() => {
          reqType == ReqType.Rest
            ? addRESTHistoryEntry({
                v: 1,
                id,
                request: translateToNewRequest(JSON.parse(request)),
                responseMeta: JSON.parse(responseMetadata),
                star: isStarred,
                updatedOn: new Date(executedOn),
              })
            : addGraphqlHistoryEntry({
                v: 1,
                id,
                request: translateToGQLRequest(JSON.parse(request)),
                response: decodeGQLHistoryResponse(responseMetadata),
                star: isStarred,
                updatedOn: new Date(executedOn),
              })
        })
    }
  })

  return userHistoryCreatedSub
}

// currently the updates are only for toggling the star
function setupUserHistoryUpdatedSubscription() {
  const [userHistoryUpdated$, userHistoryUpdatedSub] =
    runUserHistoryUpdatedSubscription()

  userHistoryUpdated$.subscribe((res) => {
    if (E.isRight(res)) {
      const { id, reqType, isStarred } = res.right.userHistoryUpdated

      if (reqType == ReqType.Rest) {
        const existingEntry = restHistoryStore.value.state.find(
          (entry) => entry.id == id
        )

        // Only toggle if the store entry's star doesn't match the server state.
        // Without this guard, the subscription echo from the same client's own
        // toggle would cause a second toggle and revert the star.
        if (existingEntry && existingEntry.star !== isStarred) {
          runDispatchWithOutSyncing(() => {
            toggleRESTHistoryEntryStar(existingEntry)
          })
        }
      }

      if (reqType == ReqType.Gql) {
        const existingEntry = graphqlHistoryStore.value.state.find(
          (entry) => entry.id == id
        )

        if (existingEntry && existingEntry.star !== isStarred) {
          runDispatchWithOutSyncing(() => {
            toggleGraphqlHistoryEntryStar(existingEntry)
          })
        }
      }
    }
  })

  return userHistoryUpdatedSub
}

function setupUserHistoryDeletedSubscription() {
  const [userHistoryDeleted$, userHistoryDeletedSub] =
    runUserHistoryDeletedSubscription()

  userHistoryDeleted$.subscribe((res) => {
    if (E.isRight(res)) {
      const { id, reqType } = res.right.userHistoryDeleted

      if (reqType == ReqType.Gql) {
        const deletedEntry = graphqlHistoryStore.value.state.find(
          (entry) => entry.id == id
        )

        deletedEntry &&
          runDispatchWithOutSyncing(() => {
            deleteGraphqlHistoryEntry(deletedEntry)
          })
      }

      if (reqType == ReqType.Rest) {
        const deletedEntry = restHistoryStore.value.state.find(
          (entry) => entry.id == id
        )

        deletedEntry &&
          runDispatchWithOutSyncing(() => {
            deleteRESTHistoryEntry(deletedEntry)
          })
      }
    }
  })

  return userHistoryDeletedSub
}

function setupUserHistoryDeletedManySubscription() {
  const [userHistoryDeletedMany$, userHistoryDeletedManySub] =
    runUserHistoryDeletedManySubscription()

  userHistoryDeletedMany$.subscribe((res) => {
    if (E.isRight(res)) {
      const { reqType } = res.right.userHistoryDeletedMany

      runDispatchWithOutSyncing(() => {
        reqType == ReqType.Rest ? clearRESTHistory() : clearGraphqlHistory()
      })
    }
  })

  return userHistoryDeletedManySub
}

function setupUserHistoryStoreStatusChangedSubscription() {
  // Only self-host exposes the infra-config toggle this subscription tracks;
  // backends without it (e.g. cloud) skip listening entirely.
  const subscribeToHistoryStoreStatus =
    platform.sync?.history?.subscribeToHistoryStoreStatus

  if (!subscribeToHistoryStoreStatus) {
    return { unsubscribe: () => {} }
  }

  return subscribeToHistoryStoreStatus((enabled) => {
    isHistoryStoreEnabled.value = enabled
  })
}

function setupUserHistoryAllDeletedSubscription() {
  const [userHistoryAllDeleted$, userHistoryAllDeletedSub] =
    runUserHistoryAllDeletedSubscription()

  userHistoryAllDeleted$.subscribe((res) => {
    if (E.isRight(res)) {
      runDispatchWithOutSyncing(() => {
        clearRESTHistory()
        clearGraphqlHistory()
      })
    }
  })

  return userHistoryAllDeletedSub
}

export const isHistoryStoreEnabled = ref(false)
const isFetchingHistoryStoreStatus = ref(false)
const hasErrorFetchingHistoryStoreStatus = ref(false)

export const def: HistoryPlatformDef = {
  initHistorySync,
  requestHistoryStore: {
    isHistoryStoreEnabled,
    isFetchingHistoryStoreStatus,
    hasErrorFetchingHistoryStoreStatus,
  },
}
