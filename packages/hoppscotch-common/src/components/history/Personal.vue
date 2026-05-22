<template>
  <div>
    <div
      class="sticky top-0 z-10 flex flex-shrink-0 flex-col overflow-x-auto border-b border-dividerLight bg-primary"
    >
      <div class="flex">
        <input
          v-model="filterText"
          type="search"
          autocomplete="off"
          class="flex w-full bg-transparent px-4 py-2 h-8"
          :placeholder="`${t('action.search')}`"
        />
        <div class="flex">
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            to="https://docs.hoppscotch.io/documentation/features/history"
            blank
            :title="t('app.wiki')"
            :icon="IconHelpCircle"
          />
          <tippy interactive trigger="click" theme="popover">
            <HoppButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('action.filter')"
              :icon="IconFilter"
            />
            <template #content="{ hide }">
              <div ref="tippyActions" class="flex flex-col focus:outline-none">
                <div class="pb-2 pl-4 text-tiny text-secondaryLight">
                  {{ t("action.filter") }}
                </div>
                <HoppSmartRadioGroup
                  v-model="filterSelection"
                  :radios="filters"
                  @update:model-value="hide()"
                />
                <hr />
                <div class="pb-2 pl-4 text-tiny text-secondaryLight">
                  {{ t("action.group_by") }}
                </div>
                <HoppSmartRadioGroup
                  v-model="groupSelection"
                  :radios="groups"
                  @update:model-value="hide()"
                />
              </div>
            </template>
          </tippy>
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            data-testid="clear_history"
            :disabled="
              history.length === 0 ||
              !isHistoryStoreEnabled ||
              isFetchingHistoryStoreStatus
            "
            :icon="IconTrash2"
            :title="t('action.clear_all')"
            @click="confirmRemove = true"
          />
        </div>
      </div>
    </div>
    <div
      v-if="isHistoryStoreEnabled && !isFetchingHistoryStoreStatus"
      class="flex flex-col"
    >
      <details
        v-for="(
          filteredHistoryGroup, filteredHistoryGroupIndex
        ) in filteredHistoryGroups"
        :key="`filteredHistoryGroup-${filteredHistoryGroupIndex}`"
        class="flex flex-col"
        open
      >
        <summary
          class="group flex min-w-0 flex-1 cursor-pointer items-center justify-between text-tiny text-secondaryLight transition focus:outline-none"
        >
          <span
            class="inline-flex items-center justify-center truncate px-4 py-2 transition group-hover:text-secondary"
          >
            <icon-lucide-chevron-right
              class="indicator mr-2 flex flex-shrink-0"
            />
            <span
              :class="[
                { 'capitalize-first': groupSelection === 'TIME' },
                'truncate',
              ]"
            >
              {{ filteredHistoryGroupIndex }}
            </span>
          </span>
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :icon="IconTrash"
            color="red"
            :title="t('action.remove')"
            class="hidden group-hover:inline-flex"
            @click="deleteBatchHistoryEntry(filteredHistoryGroup)"
          />
        </summary>
        <component
          :is="resolveCardComponent(entry.entry)"
          v-for="(entry, index) in filteredHistoryGroup"
          :id="index"
          :key="`entry-${index}`"
          :entry="entry.entry"
          :show-more="showMore"
          @toggle-star="toggleStar(entry.entry)"
          @delete-entry="deleteHistory(entry.entry)"
          @use-entry="useHistory(toRaw(entry.entry))"
          @add-to-collection="addToCollection(entry.entry)"
        />
      </details>
    </div>
    <HoppSmartPlaceholder
      v-if="!isHistoryStoreEnabled && !isFetchingHistoryStoreStatus"
      :src="`/images/states/${colorMode.value}/time.svg`"
      :alt="`${t('empty.history')}`"
      :text="t('settings.history_disabled')"
    />
    <HoppSmartPlaceholder
      v-else-if="history.length === 0"
      :src="`/images/states/${colorMode.value}/time.svg`"
      :alt="`${t('empty.history')}`"
      :text="t('empty.history')"
    />
    <HoppSmartPlaceholder
      v-else-if="
        Object.keys(filteredHistoryGroups).length === 0 ||
        filteredHistory.length === 0
      "
      :text="`${t('state.nothing_found')} ‟${filterText || filterSelection}”`"
    >
      <template #icon>
        <icon-lucide-search class="svg-icons opacity-75" />
      </template>
      <template #body>
        <HoppButtonSecondary
          :label="t('action.clear')"
          outline
          @click="
            () => {
              filterText = ''
              filterSelection = 'ALL'
            }
          "
        />
      </template>
    </HoppSmartPlaceholder>
    <HoppSmartConfirmModal
      :show="confirmRemove"
      :title="`${t('confirm.remove_history')}`"
      @hide-modal="confirmRemove = false"
      @resolve="clearHistory"
    />
  </div>
</template>

<script setup lang="ts">
import IconHelpCircle from "~icons/lucide/help-circle"
import IconTrash2 from "~icons/lucide/trash-2"
import IconTrash from "~icons/lucide/trash"
import IconFilter from "~icons/lucide/filter"
import { computed, ref, Ref, toRaw } from "vue"
import { useColorMode } from "@composables/theming"
import {
  HoppGQLRequest,
  HoppRESTRequest,
  makeGQLRequest,
} from "@hoppscotch/data"
import { groupBy, escapeRegExp, filter, isEqual } from "lodash-es"
import { useTimeAgo } from "@vueuse/core"
import { pipe } from "fp-ts/function"
import * as A from "fp-ts/Array"
import { combineLatest, map } from "rxjs"
import { useI18n } from "@composables/i18n"
import { useReadonlyStream } from "@composables/stream"
import { useToast } from "@composables/toast"
import {
  restHistory$,
  graphqlHistory$,
  clearRESTHistory,
  clearGraphqlHistory,
  toggleGraphqlHistoryEntryStar,
  toggleRESTHistoryEntryStar,
  deleteGraphqlHistoryEntry,
  deleteRESTHistoryEntry,
  RESTHistoryEntry,
  GQLHistoryEntry,
} from "~/newstore/history"

import HistoryRestCard from "./rest/Card.vue"
import HistoryGraphqlCard from "./graphql/Card.vue"
import HistoryGraphqlMergedCard from "./graphql/MergedCard.vue"
import { defineActionHandler, invokeAction } from "~/helpers/actions"
import { useService } from "dioc/vue"
import { WorkspaceTabsService } from "~/services/tab/workspace-tabs"
import { GQLTabService } from "~/services/tab/graphql"
import { isRESTRequest } from "~/helpers/request-type"
import { platform } from "~/platform"

type HistoryEntry = GQLHistoryEntry | RESTHistoryEntry

type TimedHistoryEntry = {
  entry: HistoryEntry
  timeAgo: Ref<string>
}

const props = defineProps<{
  // "rest" / "graphql"    — single-protocol modes used by the standalone REST
  //                         and /graphql pages; behaviour is unchanged.
  // "unified-workspace"   — unified workspace mode; interleaves both stores
  //                         sorted by `updatedOn`, routes each entry by shape.
  page: "rest" | "graphql" | "unified-workspace"
}>()

const toast = useToast()
const t = useI18n()
const colorMode = useColorMode()

const filterText = ref("")
const showMore = ref(false)
const confirmRemove = ref(false)

// Merged stream — combines both stores, sorts newest first. Built once and
// only subscribed to in "unified-workspace" mode so single-protocol pages
// don't pay the extra combineLatest subscription.
const mergedHistory$ = combineLatest([restHistory$, graphqlHistory$]).pipe(
  map(([rest, gql]) => {
    const merged = [...rest, ...gql] as HistoryEntry[]
    return merged.sort(
      (a, b) => (b.updatedOn?.getTime() ?? 0) - (a.updatedOn?.getTime() ?? 0)
    )
  })
)

const historySource$ =
  props.page === "rest"
    ? restHistory$
    : props.page === "graphql"
      ? graphqlHistory$
      : mergedHistory$

const history = useReadonlyStream<HistoryEntry[]>(historySource$, [])

const { isHistoryStoreEnabled, isFetchingHistoryStoreStatus } =
  "requestHistoryStore" in platform.sync.history &&
  platform.sync.history.requestHistoryStore
    ? platform.sync.history.requestHistoryStore
    : {
        isHistoryStoreEnabled: ref(true),
        isFetchingHistoryStoreStatus: ref(false),
      }

const deepCheckForRegex = (value: unknown, regExp: RegExp): boolean => {
  if (value === null || value === undefined) return false

  if (typeof value === "string") return regExp.test(value)
  if (typeof value === "number") return regExp.test(value.toString())

  if (typeof value === "object")
    return Object.values(value).some((input) =>
      deepCheckForRegex(input, regExp)
    )
  if (Array.isArray(value))
    return value.some((input) => deepCheckForRegex(input, regExp))

  return false
}

const filteredHistory = computed(() =>
  pipe(
    history.value as HistoryEntry[],
    A.filter(
      (
        input
      ): input is HistoryEntry & {
        updatedOn: NonNullable<HistoryEntry["updatedOn"]>
      } => {
        return (
          !!input.updatedOn &&
          (filterText.value.length === 0 ||
            deepCheckForRegex(
              input,
              new RegExp(escapeRegExp(filterText.value), "gi")
            ))
        )
      }
    ),
    A.map(
      (entry): TimedHistoryEntry => ({
        entry,
        timeAgo: useTimeAgo(entry.updatedOn),
      })
    )
  )
)

const filters = computed(() => [
  { value: "ALL" as const, label: t("filter.all") },
  { value: "STARRED" as const, label: t("filter.starred") },
])

type FilterMode = (typeof filters)["value"][number]["value"]

const filterSelection = ref<FilterMode>("ALL")

const groups = computed(() => [
  { value: "TIME" as const, label: t("group.time") },
  { value: "URL" as const, label: t("group.url") },
])

type GroupMode = (typeof groups)["value"][number]["value"]

const groupSelection = ref<GroupMode>("TIME")

const filteredHistoryGroups = computed(() =>
  groupBy(
    filter(filteredHistory.value, (input) =>
      filterSelection.value === "STARRED" ? input.entry.star : true
    ),
    (input) =>
      groupSelection.value === "TIME"
        ? input.timeAgo.value
        : getAppropriateURL(input.entry)
  )
)

// Picks the right card per entry. The unified-workspace view uses a GQL card
// variant styled with a left-side GraphQL icon chip (so REST and GQL rows
// align in the same list). The legacy /graphql page keeps the original card
// so its visual footprint stays identical to pre-merge.
const resolveCardComponent = (entry: HistoryEntry) => {
  if (isRESTRequest(entry.request)) return HistoryRestCard
  return props.page === "unified-workspace"
    ? HistoryGraphqlMergedCard
    : HistoryGraphqlCard
}

const getAppropriateURL = (entry: HistoryEntry) =>
  isRESTRequest(entry.request)
    ? (entry.request as HoppRESTRequest).endpoint
    : (entry.request as HoppGQLRequest).url

const clearHistory = () => {
  // Unified-workspace mode clears both stores; otherwise mirror the legacy
  // behaviour of the single-protocol pages so /graphql and REST-only flows
  // are unchanged.
  if (props.page === "unified-workspace") {
    clearRESTHistory()
    clearGraphqlHistory()
  } else if (props.page === "rest") {
    clearRESTHistory()
  } else {
    clearGraphqlHistory()
  }
  toast.success(`${t("state.history_deleted")}`)
}

// Unified workspace tab service (used for REST tabs everywhere, and for GQL
// tabs in unified-workspace mode). The legacy /graphql page still uses its
// own GQLTabService — bound below so we can route GQL clicks correctly there
// without changing observable behaviour for that page.
const tabs = useService(WorkspaceTabsService)
const gqlTabs = useService(GQLTabService)

// Compare the signature fields of two requests. We deliberately exclude:
//   - `responses`  — mutated whenever the tab re-runs the request
//   - `v`, `_ref_id`, `id` — schema/version/persistence metadata, not user intent
//   - `name`, `description` — cosmetic; renaming a tab shouldn't fork it
// Everything that affects the wire payload or runtime behaviour IS compared,
// so two history entries that differ only in (say) preRequestScript are
// recognised as distinct.
const restRequestsMatch = (a: HoppRESTRequest, b: HoppRESTRequest) =>
  a.endpoint === b.endpoint &&
  a.method === b.method &&
  a.preRequestScript === b.preRequestScript &&
  a.testScript === b.testScript &&
  isEqual(a.body, b.body) &&
  isEqual(a.headers, b.headers) &&
  isEqual(a.params, b.params) &&
  isEqual(a.auth, b.auth) &&
  isEqual(a.requestVariables, b.requestVariables)

const gqlRequestsMatch = (a: HoppGQLRequest, b: HoppGQLRequest) =>
  a.url === b.url &&
  a.query === b.query &&
  a.variables === b.variables &&
  isEqual(a.headers, b.headers) &&
  isEqual(a.auth, b.auth)

const useHistory = (entry: HistoryEntry) => {
  if (isRESTRequest(entry.request)) {
    const restEntry = entry.request as HoppRESTRequest

    // Focus an already-open REST tab that still matches the entry's
    // signature — avoids opening duplicate tabs when the user re-clicks
    // the same history row. Only meaningful in unified-workspace mode (the
    // legacy /graphql page doesn't render REST entries).
    const existing = tabs
      .getTabs()
      .find(
        (t) =>
          t.document.type === "request" &&
          restRequestsMatch(t.document.request, restEntry)
      )
    if (existing) {
      tabs.setActiveTab(existing.id)
      return
    }

    tabs.createNewTab({
      type: "request",
      request: restEntry,
      isDirty: false,
    })
    return
  }

  // GraphQL entry — normalize via makeGQLRequest so we get schema defaults
  // (responses: {}, version, etc.) regardless of how the entry was stored.
  const gqlEntryRequest = entry.request as HoppGQLRequest
  const gqlRequest = makeGQLRequest({
    name: gqlEntryRequest.name,
    url: gqlEntryRequest.url,
    headers: gqlEntryRequest.headers,
    query: gqlEntryRequest.query,
    variables: gqlEntryRequest.variables,
    auth: gqlEntryRequest.auth,
    description: gqlEntryRequest.description ?? null,
    responses: {},
  })

  if (props.page === "graphql") {
    // Legacy /graphql page — keep using GQLTabService so this path stays
    // byte-identical to the pre-merge behaviour of HistoryGraphqlCard.
    const existing = gqlTabs
      .getTabs()
      .find((t) => gqlRequestsMatch(t.document.request, gqlEntryRequest))
    if (existing) {
      gqlTabs.setActiveTab(existing.id)
      return
    }

    gqlTabs.createNewTab({
      request: gqlRequest,
      isDirty: false,
    })
  } else {
    // Unified-workspace mode — open the GQL entry as a gql-request tab in
    // the workspace tab strip.
    const existing = tabs
      .getTabs()
      .find(
        (t) =>
          t.document.type === "gql-request" &&
          gqlRequestsMatch(t.document.request, gqlEntryRequest)
      )
    if (existing) {
      tabs.setActiveTab(existing.id)
      return
    }

    tabs.createNewTab({
      type: "gql-request",
      request: gqlRequest,
      isDirty: false,
      cursorPosition: 0,
    })
  }
}

const deleteBatchHistoryEntry = (entries: TimedHistoryEntry[]) => {
  entries.forEach(({ entry }) => {
    if (isRESTRequest(entry.request)) {
      deleteRESTHistoryEntry(entry as RESTHistoryEntry)
    } else {
      deleteGraphqlHistoryEntry(entry as GQLHistoryEntry)
    }
  })
  toast.success(`${t("state.deleted")}`)
}

const deleteHistory = (entry: HistoryEntry) => {
  if (isRESTRequest(entry.request)) {
    deleteRESTHistoryEntry(entry as RESTHistoryEntry)
  } else {
    deleteGraphqlHistoryEntry(entry as GQLHistoryEntry)
  }
  toast.success(`${t("state.deleted")}`)
}

const addToCollection = (entry: HistoryEntry) => {
  // Only REST entries support add-to-collection from history today — the GQL
  // card doesn't emit `add-to-collection`, so this is a no-op for GQL even
  // in unified-workspace mode. Wiring GQL save-as is its own follow-up.
  if (isRESTRequest(entry.request)) {
    invokeAction("request.save-as", {
      requestType: "rest",
      request: entry.request as HoppRESTRequest,
    })
  }
}

const toggleStar = (entry: HistoryEntry) => {
  if (isRESTRequest(entry.request)) {
    toggleRESTHistoryEntryStar(entry as RESTHistoryEntry)
  } else {
    toggleGraphqlHistoryEntryStar(entry as GQLHistoryEntry)
  }
}

defineActionHandler("history.clear", () => {
  confirmRemove.value = true
})
</script>
