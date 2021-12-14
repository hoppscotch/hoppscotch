<template>
  <AppSection label="history">
    <div class="bg-primary border-b border-dividerLight flex top-0 z-10 sticky">
      <input
        v-model="filterText"
        type="search"
        autocomplete="off"
        class="bg-transparent flex w-full p-4 py-2"
        :placeholder="`${$t('action.search')}`"
      />
      <div class="flex">
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          to="https://docs.hoppscotch.io/features/history"
          blank
          :title="$t('app.wiki')"
          svg="help-circle"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          data-testid="clear_history"
          :disabled="history.length === 0"
          svg="trash-2"
          :title="$t('action.clear_all')"
          @click.native="confirmRemove = true"
        />
      </div>
    </div>
    <div class="flex flex-col">
      <div v-for="(entry, index) in filteredHistory" :key="`entry-${index}`">
        <HistoryRestCard
          v-if="page == 'rest'"
          :id="index"
          :entry="entry"
          :show-more="showMore"
          @toggle-star="toggleStar(entry)"
          @delete-entry="deleteHistory(entry)"
          @use-entry="useHistory(entry)"
        />
        <HistoryGraphqlCard
          v-if="page == 'graphql'"
          :entry="entry"
          :show-more="showMore"
          @toggle-star="toggleStar(entry)"
          @delete-entry="deleteHistory(entry)"
          @use-entry="useHistory(entry)"
        />
      </div>
    </div>
    <div
      v-if="!(filteredHistory.length !== 0 || history.length === 0)"
      class="flex flex-col text-secondaryLight p-4 items-center justify-center"
    >
      <i class="opacity-75 pb-2 material-icons">manage_search</i>
      <span class="text-center my-2">
        {{ $t("state.nothing_found") }} "{{ filterText }}"
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
        :alt="$t('empty.history')"
      />
      <span class="text-center mb-4">
        {{ $t("empty.history") }}
      </span>
    </div>
    <SmartConfirmModal
      :show="confirmRemove"
      :title="`${$t('confirm.remove_history')}`"
      @hide-modal="confirmRemove = false"
      @resolve="clearHistory"
    />
  </AppSection>
</template>

<script lang="ts">
import { defineComponent, PropType } from "@nuxtjs/composition-api"
import { useReadonlyStream } from "~/helpers/utils/composables"
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

export default defineComponent({
  props: {
    page: { type: String as PropType<"rest" | "graphql">, default: null },
  },
  setup(props) {
    return {
      history: useReadonlyStream<RESTHistoryEntry[] | GQLHistoryEntry[]>(
        props.page === "rest" ? restHistory$ : graphqlHistory$,
        []
      ),
    }
  },
  data() {
    return {
      filterText: "",
      showMore: false,
      confirmRemove: false,
    }
  },
  computed: {
    filteredHistory(): any[] {
      const filteringHistory = this.history as Array<
        RESTHistoryEntry | GQLHistoryEntry
      >

      return filteringHistory.filter(
        (entry: RESTHistoryEntry | GQLHistoryEntry) => {
          const filterText = this.filterText.toLowerCase()
          return Object.keys(entry).some((key) => {
            let value = entry[key as keyof typeof entry]
            if (value) {
              value = `${value}`
              return value.toLowerCase().includes(filterText)
            }
            return false
          })
        }
      )
    },
  },
  methods: {
    clearHistory() {
      if (this.page === "rest") clearRESTHistory()
      else clearGraphqlHistory()
      this.$toast.success(`${this.$t("state.history_deleted")}`)
    },
    useHistory(entry: any) {
      if (this.page === "rest") setRESTRequest(entry.request)
    },
    deleteHistory(entry: any) {
      if (this.page === "rest") deleteRESTHistoryEntry(entry)
      else deleteGraphqlHistoryEntry(entry)
      this.$toast.success(`${this.$t("state.deleted")}`)
    },
    toggleStar(entry: any) {
      if (this.page === "rest") toggleRESTHistoryEntryStar(entry)
      else toggleGraphqlHistoryEntryStar(entry)
    },
  },
})
</script>
