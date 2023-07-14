<template>
  <div>
    <div
      class="sticky top-0 z-10 flex flex-col flex-shrink-0 overflow-x-auto border-b bg-primary border-dividerLight"
    >
      <WorkspaceCurrent :section="t('tab.history')" />
      <div class="flex">
        <input
          v-model="filterText"
          type="search"
          autocomplete="off"
          class="flex flex-1 p-4 py-2 bg-transparent"
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
            :disabled="history.length === 0"
            :icon="IconTrash2"
            :title="t('action.clear_all')"
            @click="confirmRemove = true"
          />
        </div>
      </div>
    </div>
    <div class="flex flex-col">
      <details
        v-for="(
          filteredHistoryGroup, filteredHistoryGroupIndex
        ) in filteredHistoryGroups"
        :key="`filteredHistoryGroup-${filteredHistoryGroupIndex}`"
        class="flex flex-col"
        open
      >
        <summary
          class="flex items-center justify-between flex-1 min-w-0 transition cursor-pointer focus:outline-none text-secondaryLight text-tiny group"
        >
          <span
            class="inline-flex items-center justify-center px-4 py-2 transition group-hover:text-secondary truncate"
          >
            <icon-lucide-chevron-right
              class="mr-2 indicator flex flex-shrink-0"
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
          :is="page === 'rest' ? HistoryRestCard : HistoryGraphqlCard"
          v-for="(entry, index) in filteredHistoryGroup"
          :id="index"
          :key="`entry-${index}`"
          :entry="entry.entry"
          :show-more="showMore"
          @toggle-star="toggleStar(entry.entry)"
          @delete-entry="deleteHistory(entry.entry)"
          @use-entry="useHistory(toRaw(entry.entry))"
        />
      </details>
    </div>
    <div
      v-if="history.length === 0"
      class="flex flex-col items-center justify-center p-4 text-secondaryLight"
    >
      <img
        :src="`/images/states/${colorMode.value}/history.svg`"
        loading="lazy"
        class="inline-flex flex-col object-contain object-center w-16 h-16 my-4"
        :alt="`${t('empty.history')}`"
      />
      <span class="mb-4 text-center">
        {{ t("empty.history") }}
      </span>
    </div>
    <div
      v-else-if="
        Object.keys(filteredHistoryGroups).length === 0 ||
        filteredHistory.length === 0
      "
      class="flex flex-col items-center justify-center p-4 text-secondaryLight"
    >
      <icon-lucide-search class="pb-2 opacity-75 svg-icons" />
      <span class="mt-2 mb-4 text-center">
        {{ t("state.nothing_found") }} "{{ filterText || filterSelection }}"
      </span>
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
    </div>
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
import { HoppGQLRequest, HoppRESTRequest } from "@hoppscotch/data"
import { groupBy, escapeRegExp, filter } from "lodash-es"
import { useTimeAgo } from "@vueuse/core"
import { pipe } from "fp-ts/function"
import * as A from "fp-ts/Array"
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
import { createNewTab } from "~/helpers/rest/tab"

type HistoryEntry = GQLHistoryEntry | RESTHistoryEntry

type TimedHistoryEntry = {
  entry: HistoryEntry
  timeAgo: Ref<string>
}

const props = defineProps<{
  page: "rest" | "graphql"
}>()

const toast = useToast()
const t = useI18n()
const colorMode = useColorMode()

const filterText = ref("")
const showMore = ref(false)
const confirmRemove = ref(false)

const history = useReadonlyStream<RESTHistoryEntry[] | GQLHistoryEntry[]>(
  props.page === "rest" ? restHistory$ : graphqlHistory$,
  []
)

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

const getAppropriateURL = (entry: HistoryEntry) => {
  if (props.page === "rest") {
    return (entry.request as HoppRESTRequest).endpoint
  } else if (props.page === "graphql") {
    return (entry.request as HoppGQLRequest).url
  }
}

const clearHistory = () => {
  if (props.page === "rest") clearRESTHistory()
  else clearGraphqlHistory()
  toast.success(`${t("state.history_deleted")}`)
}

// NOTE: For GQL, the HistoryGraphqlCard component already implements useEntry
// (That is not a really good behaviour tho ¯\_(ツ)_/¯)
const useHistory = (entry: RESTHistoryEntry) => {
  createNewTab({
    request: entry.request,
    isDirty: false,
  })
}

const isRESTHistoryEntry = (
  entries: TimedHistoryEntry[]
): entries is Array<TimedHistoryEntry & { entry: RESTHistoryEntry }> =>
  // If the page is rest, then we can guarantee what we have is a RESTHistoryEnry
  props.page === "rest"

const deleteBatchHistoryEntry = (entries: TimedHistoryEntry[]) => {
  if (isRESTHistoryEntry(entries)) {
    entries.forEach((entry) => {
      deleteRESTHistoryEntry(entry.entry)
    })
  } else {
    entries.forEach((entry) => {
      deleteGraphqlHistoryEntry(entry.entry as GQLHistoryEntry)
    })
  }
  toast.success(`${t("state.deleted")}`)
}

const deleteHistory = (entry: HistoryEntry) => {
  if (props.page === "rest") deleteRESTHistoryEntry(entry as RESTHistoryEntry)
  else deleteGraphqlHistoryEntry(entry as GQLHistoryEntry)
  toast.success(`${t("state.deleted")}`)
}

const toggleStar = (entry: HistoryEntry) => {
  // History entry type specified because function does not know the type
  if (props.page === "rest")
    toggleRESTHistoryEntryStar(entry as RESTHistoryEntry)
  else toggleGraphqlHistoryEntryStar(entry as GQLHistoryEntry)
}
</script>
