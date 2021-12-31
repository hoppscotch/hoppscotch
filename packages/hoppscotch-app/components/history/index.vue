<template>
  <div>
    <div class="sticky top-0 z-10 flex border-b bg-primary border-dividerLight">
      <input
        v-model="filterText"
        type="search"
        autocomplete="off"
        class="flex w-full p-4 py-2 bg-transparent"
        :placeholder="`${t('action.search')}`"
      />
      <div class="flex">
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          to="https://docs.hoppscotch.io/features/history"
          blank
          :title="t('app.wiki')"
          svg="help-circle"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          data-testid="clear_history"
          :disabled="history.length === 0"
          svg="trash-2"
          :title="t('action.clear_all')"
          @click.native="confirmRemove = true"
        />
      </div>
    </div>
    <div class="flex flex-col">
      <details
        v-for="(filteredHistoryGroup, filteredHistoryGroupIndex) in groupByDate(
          filteredHistory,
          'updatedOn'
        )"
        :key="`filteredHistoryGroup-${filteredHistoryGroupIndex}`"
        class="flex flex-col"
        open
      >
        <summary
          class="flex items-center justify-between flex-1 min-w-0 transition cursor-pointer text-secondaryLight text-tiny group"
        >
          <span
            class="px-4 py-2 truncate transition group-hover:text-secondary capitalize-first"
          >
            {{ filteredHistoryGroupIndex }}
          </span>
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            svg="trash"
            color="red"
            :title="$t('action.remove')"
            class="hidden group-hover:inline-flex"
            @click.native="deleteBattleHistoryEntry(filteredHistoryGroup)"
          />
        </summary>
        <div
          v-for="(entry, index) in filteredHistoryGroup"
          :key="`entry-${index}`"
        >
          <component
            :is="page == 'rest' ? 'HistoryRestCard' : 'HistoryGraphqlCard'"
            :id="index"
            :entry="entry"
            :show-more="showMore"
            @toggle-star="toggleStar(entry)"
            @delete-entry="deleteHistory(entry)"
            @use-entry="useHistory(entry)"
          />
        </div>
      </details>
    </div>
    <div
      v-if="!(filteredHistory.length !== 0 || history.length === 0)"
      class="flex flex-col items-center justify-center p-4 text-secondaryLight"
    >
      <i class="pb-2 opacity-75 material-icons">manage_search</i>
      <span class="my-2 text-center">
        {{ t("state.nothing_found") }} "{{ filterText }}"
      </span>
    </div>
    <div
      v-if="history.length === 0"
      class="flex flex-col items-center justify-center p-4 text-secondaryLight"
    >
      <img
        :src="`/images/states/${$colorMode.value}/history.svg`"
        loading="lazy"
        class="inline-flex flex-col object-contain object-center w-16 h-16 my-4"
        :alt="`${t('empty.history')}`"
      />
      <span class="mb-4 text-center">
        {{ t("empty.history") }}
      </span>
    </div>
    <SmartConfirmModal
      :show="confirmRemove"
      :title="`${t('confirm.remove_history')}`"
      @hide-modal="confirmRemove = false"
      @resolve="clearHistory"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "@nuxtjs/composition-api"
import * as timeago from "timeago.js"
import {
  useI18n,
  useReadonlyStream,
  useToast,
} from "~/helpers/utils/composables"
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
import { setRESTRequest } from "~/newstore/RESTSession"

const props = defineProps<{
  page: "rest" | "graphql"
}>()

const filterText = ref("")
const showMore = ref(false)
const confirmRemove = ref(false)
const toast = useToast()
const t = useI18n()

const groupByDate = (array: any[], key: string) => {
  return array.reduce((rv: any, x: any) => {
    ;(rv[timeago.format(x[key])] = rv[timeago.format(x[key])] || []).push(x)
    return rv
  }, {})
}

const history = useReadonlyStream<RESTHistoryEntry[] | GQLHistoryEntry[]>(
  props.page === "rest" ? restHistory$ : graphqlHistory$,
  []
)

const filteredHistory = computed(() => {
  const filteringHistory = history as any as Array<
    RESTHistoryEntry | GQLHistoryEntry
  >

  return filteringHistory.value.filter(
    (entry: RESTHistoryEntry | GQLHistoryEntry) => {
      return Object.keys(entry).some((key) => {
        let value = entry[key as keyof typeof entry]
        if (value) {
          value = `${value}`
          return value.toLowerCase().includes(filterText.value.toLowerCase())
        }
        return false
      })
    }
  )
})

const clearHistory = () => {
  if (props.page === "rest") clearRESTHistory()
  else clearGraphqlHistory()
  toast.success(`${t("state.history_deleted")}`)
}

const useHistory = (entry: any) => {
  if (props.page === "rest") setRESTRequest(entry.request)
}

const deleteBattleHistoryEntry = (entries: number[]) => {
  if (props.page === "rest") {
    entries.forEach((entry: any) => {
      deleteRESTHistoryEntry(entry)
    })
  } else {
    entries.forEach((entry: any) => {
      deleteGraphqlHistoryEntry(entry)
    })
  }
  toast.success(`${t("state.deleted")}`)
}

const deleteHistory = (entry: any) => {
  if (props.page === "rest") deleteRESTHistoryEntry(entry)
  else deleteGraphqlHistoryEntry(entry)
  toast.success(`${t("state.deleted")}`)
}

const toggleStar = (entry: any) => {
  if (props.page === "rest") toggleRESTHistoryEntryStar(entry)
  else toggleGraphqlHistoryEntryStar(entry)
}
</script>
