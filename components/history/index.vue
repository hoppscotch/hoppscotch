<template>
  <AppSection label="history">
    <div
      class="
        flex
        sticky
        z-10
        bg-primaryLight
        top-10
        border-b border-dividerLight
      "
    >
      <input
        v-model="filterText"
        type="search"
        class="px-4 py-3 text-xs flex flex-1 bg-primaryLight focus:outline-none"
        :placeholder="$t('search')"
      />
      <ButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        data-testid="clear_history"
        :disabled="history.length === 0"
        icon="clear_all"
        :title="$t('clear_all')"
        @click.native="confirmRemove = true"
      />
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
      class="flex items-center text-secondaryLight flex-col p-4 justify-center"
    >
      <i class="material-icons opacity-50 pb-2">manage_search</i>
      <span class="text-xs">
        {{ $t("nothing_found") }} "{{ filterText }}"
      </span>
    </div>
    <div
      v-if="history.length === 0"
      class="flex items-center text-secondaryLight flex-col p-4 justify-center"
    >
      <i class="material-icons opacity-50 pb-2">schedule</i>
      <span class="text-xs">
        {{ $t("history_empty") }}
      </span>
    </div>
    <SmartConfirmModal
      :show="confirmRemove"
      :title="$t('are_you_sure_remove_history')"
      @hide-modal="confirmRemove = false"
      @resolve="clearHistory"
    />
  </AppSection>
</template>

<script>
import {
  restHistory$,
  graphqlHistory$,
  clearRESTHistory,
  clearGraphqlHistory,
  toggleGraphqlHistoryEntryStar,
  toggleRESTHistoryEntryStar,
  deleteGraphqlHistoryEntry,
  deleteRESTHistoryEntry,
} from "~/newstore/history"

export default {
  props: {
    page: { type: String, default: null },
  },
  data() {
    return {
      filterText: "",
      showMore: false,
      confirmRemove: false,
    }
  },
  subscriptions() {
    return {
      history: this.page === "rest" ? restHistory$ : graphqlHistory$,
    }
  },
  computed: {
    filteredHistory() {
      const filteringHistory = this.history

      return filteringHistory.filter((entry) => {
        const filterText = this.filterText.toLowerCase()
        return Object.keys(entry).some((key) => {
          let value = entry[key]
          value = typeof value !== "string" ? value.toString() : value
          return value.toLowerCase().includes(filterText)
        })
      })
    },
  },
  methods: {
    clearHistory() {
      if (this.page === "rest") clearRESTHistory()
      else clearGraphqlHistory()

      this.$toast.error(this.$t("history_deleted"), {
        icon: "delete",
      })
    },
    useHistory(entry) {
      this.$emit("useHistory", entry)
    },
    deleteHistory(entry) {
      if (this.page === "rest") deleteRESTHistoryEntry(entry)
      else deleteGraphqlHistoryEntry(entry)

      this.$toast.error(this.$t("deleted"), {
        icon: "delete",
      })
    },
    toggleStar(entry) {
      if (this.page === "rest") toggleRESTHistoryEntryStar(entry)
      else toggleGraphqlHistoryEntryStar(entry)
    },
  },
}
</script>
