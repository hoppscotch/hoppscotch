import { authEvents$, def as platformAuth } from "@app/platform/auth/web"
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
} from "@hoppscotch/common/newstore/history"
import { translateToNewRequest, translateToGQLRequest } from "@hoppscotch/data"
import { HistoryPlatformDef } from "@hoppscotch/common/platform/history"
import {
  getUserHistoryEntries,
  getUserHistoryStore,
  runUserHistoryAllDeletedSubscription,
  runUserHistoryCreatedSubscription,
  runUserHistoryDeletedManySubscription,
  runUserHistoryDeletedSubscription,
  runUserHistoryStoreStatusChangedSubscription,
  runUserHistoryUpdatedSubscription,
} from "@app/platform/history/web/api"

import * as E from "fp-ts/Either"
import {
  restHistorySyncer,
  gqlHistorySyncer,
} from "@app/platform/history/web/sync"
import { runGQLSubscription } from "@hoppscotch/common/helpers/backend/GQLClient"
import { runDispatchWithOutSyncing } from "@app/lib/sync"
import { ReqType, ServiceStatus } from "@app/api/generated/graphql"
import { ref } from "vue"

function initHistorySync() {
  const currentUser$ = platformAuth.getCurrentUserStream()

  restHistorySyncer.startStoreSync()
  restHistorySyncer.setupSubscriptions(setupSubscriptions)

  gqlHistorySyncer.startStoreSync()

  getUserHistoryStatus()
  loadHistoryEntries()

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
  let subs: ReturnType<typeof runGQLSubscription>[1][] = []

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
  const currentUser = platformAuth.getCurrentUser()

  if (!currentUser) {
    isHistoryStoreEnabled.value = true
    return
  }

  isFetchingHistoryStoreStatus.value = true

  const res = await getUserHistoryStore()

  if (E.isLeft(res)) {
    hasErrorFetchingHistoryStoreStatus.value = true
    isFetchingHistoryStoreStatus.value = false
    return
  }

  isHistoryStoreEnabled.value =
    res.right.isUserHistoryEnabled.value === ServiceStatus.Enable

  isFetchingHistoryStoreStatus.value = false
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
  const [userHistoryStoreStatusChanged$, userHistoryStoreStatusChangedSub] =
    runUserHistoryStoreStatusChangedSubscription()

  userHistoryStoreStatusChanged$.subscribe((res) => {
    if (E.isRight(res)) {
      const status =
        res.right.infraConfigUpdate == ServiceStatus.Enable ? true : false

      isHistoryStoreEnabled.value = status
    }
  })

  return userHistoryStoreStatusChangedSub
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
