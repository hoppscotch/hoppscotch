import {
  graphqlHistoryStore,
  removeDuplicateGraphqlHistoryEntry,
  removeDuplicateRestHistoryEntry,
  restHistoryStore,
} from "~/newstore/history"
import { getSyncInitFunction, StoreSyncDefinitionOf } from "../index"

import * as E from "fp-ts/Either"
import { getSettingSubject, settingsStore } from "~/newstore/settings"

// History Sync Types
export interface HistoryAPI {
  createUserHistory: (
    request: string,
    responseMetadata: string,
    reqType: any
  ) => Promise<any>
  removeRequestFromHistory: (requestID: string) => void
  toggleHistoryStarStatus: (requestID: string) => void
  deleteAllUserHistory: (reqType: any) => void
}

export interface HistorySyncOptions {
  getSyncInitFunction: typeof getSyncInitFunction
  removeDuplicateRestHistoryEntry: typeof removeDuplicateRestHistoryEntry
  removeDuplicateGraphqlHistoryEntry: typeof removeDuplicateGraphqlHistoryEntry
  isHistoryStoreEnabled: { value: boolean }
  reqType: {
    Rest: any
    Gql: any
  }
}

export function createHistorySync(
  api: HistoryAPI,
  options: HistorySyncOptions
) {
  const restHistoryStoreSyncDefinition: StoreSyncDefinitionOf<
    typeof restHistoryStore
  > = {
    async addEntry({ entry }) {
      if (!options.isHistoryStoreEnabled.value) {
        return
      }

      const res = await api.createUserHistory(
        JSON.stringify(entry.request),
        JSON.stringify(entry.responseMeta),
        options.reqType.Rest
      )

      if (E.isRight(res)) {
        entry.id = res.right.createUserHistory.id

        // preventing double insertion from here and subscription
        options.removeDuplicateRestHistoryEntry(entry.id)
      }
    },
    deleteEntry({ entry }) {
      if (entry.id) {
        api.removeRequestFromHistory(entry.id)
      }
    },
    toggleStar({ entry }) {
      if (entry.id) {
        api.toggleHistoryStarStatus(entry.id)
      }
    },
    clearHistory() {
      api.deleteAllUserHistory(options.reqType.Rest)
    },
  }

  const gqlHistoryStoreSyncDefinition: StoreSyncDefinitionOf<
    typeof graphqlHistoryStore
  > = {
    async addEntry({ entry }) {
      if (!options.isHistoryStoreEnabled.value) {
        return
      }

      const res = await api.createUserHistory(
        JSON.stringify(entry.request),
        JSON.stringify(entry.response),
        options.reqType.Gql
      )

      if (E.isRight(res)) {
        entry.id = res.right.createUserHistory.id

        // preventing double insertion from here and subscription
        options.removeDuplicateGraphqlHistoryEntry(entry.id)
      }
    },
    deleteEntry({ entry }) {
      if (entry.id) {
        api.removeRequestFromHistory(entry.id)
      }
    },
    toggleStar({ entry }) {
      if (entry.id) {
        api.toggleHistoryStarStatus(entry.id)
      }
    },
    clearHistory() {
      api.deleteAllUserHistory(options.reqType.Gql)
    },
  }

  const restHistorySyncer = options.getSyncInitFunction(
    restHistoryStore,
    restHistoryStoreSyncDefinition,
    () => settingsStore.value.syncHistory,
    getSettingSubject("syncHistory")
  )

  const gqlHistorySyncer = options.getSyncInitFunction(
    graphqlHistoryStore,
    gqlHistoryStoreSyncDefinition,
    () => settingsStore.value.syncHistory,
    getSettingSubject("syncHistory")
  )

  return {
    restHistorySyncer,
    gqlHistorySyncer,
  }
}
