<template>
  <div>
    <div class="bg-primary border-b border-dividerLight flex top-0 z-10 sticky">
      <input
        v-model="filterText"
        type="search"
        autocomplete="off"
        class="bg-transparent flex w-full p-4 py-2"
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
      <div
        v-for="(filteredHistoryGroup, filteredHistoryGroupIndex) in groupByDate(
          filteredHistory,
          'updatedOn'
        )"
        :key="`filteredHistoryGroup-${filteredHistoryGroupIndex}`"
        class="flex flex-col"
      >
        <span
          class="ml-4 capitalize-first px-3 align-start my-2 py-1 text-secondaryLight bg-primaryLight truncate rounded-l-full flex-inline text-tiny"
        >
          {{ filteredHistoryGroupIndex }}
        </span>
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
      </div>
    </div>
    <div
      v-if="!(filteredHistory.length !== 0 || history.length === 0)"
      class="flex flex-col text-secondaryLight p-4 items-center justify-center"
    >
      <i class="opacity-75 pb-2 material-icons">manage_search</i>
      <span class="my-2 text-center">
        {{ t("state.nothing_found") }} "{{ filterText }}"
      </span>
    </div>
    <div
      v-if="history.length === 0"
      class="flex flex-col text-secondaryLight p-4 items-center justify-center"
    >
      <img
        :src="`/images/states/${$colorMode.value}/history.svg`"
        loading="lazy"
        class="flex-col object-contain object-center h-16 my-4 w-16 inline-flex"
        :alt="`${t('empty.history')}`"
      />
      <span class="text-center mb-4">
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
