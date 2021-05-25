<template>
  <AppSection ref="history" icon="history" :label="$t('history')" no-legend>
    <div class="show-on-large-screen">
      <input
        v-model="filterText"
        aria-label="Search"
        type="search"
        :placeholder="$t('search')"
        class="rounded-t-lg"
      />
    </div>
    <div
      class="divide-y virtual-list divide-dashed divide-brdColor"
      :class="{ filled: filteredHistory.length }"
    >
      <ul v-for="(entry, index) in filteredHistory" :key="`entry-${index}`">
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
      </ul>
    </div>
    <p
      :class="{ hidden: filteredHistory.length != 0 || history.length === 0 }"
      class="info"
    >
      {{ $t("nothing_found") }} "{{ filterText }}"
    </p>
    <p v-if="history.length === 0" class="info">
      <i class="material-icons">schedule</i> {{ $t("history_empty") }}
    </p>
    <div v-if="history.length !== 0" class="rounded-b-lg bg-bgDarkColor">
      <div v-if="!isClearingHistory" class="row-wrapper">
        <button
          data-testid="clear_history"
          class="icon"
          :disabled="history.length === 0"
          @click="enableHistoryClearing"
        >
          <i class="material-icons">clear_all</i>
          <span>{{ $t("clear_all") }}</span>
        </button>
        <button
          v-tooltip="{ content: !showMore ? $t('show_more') : $t('hide_more') }"
          class="icon"
          @click="toggleCollapse()"
        >
          <i class="material-icons">
            {{ !showMore ? "unfold_more" : "unfold_less" }}
          </i>
        </button>
      </div>
      <div v-else class="row-wrapper">
        <p class="info">
          <i class="material-icons">help_outline</i> {{ $t("are_you_sure") }}
        </p>
        <div>
          <button
            v-tooltip="$t('yes')"
            data-testid="confirm_clear_history"
            class="icon"
            @click="clearHistory"
          >
            <i class="material-icons">done</i>
          </button>
          <button
            v-tooltip="$t('no')"
            data-testid="reject_clear_history"
            class="icon"
            @click="disableHistoryClearing"
          >
            <i class="material-icons">close</i>
          </button>
        </div>
      </div>
    </div>
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
  deleteRESTHistoryEntry
} from "~/newstore/history"

export default {
  props: {
    page: { type: String, default: null },
  },
  data() {
    return {
      filterText: "",
      showFilter: false,
      isClearingHistory: false,
      showMore: false,
    }
  },
  subscriptions() {
    return {
      history: this.page === "rest" ? restHistory$ : graphqlHistory$
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

      this.isClearingHistory = false

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
    enableHistoryClearing() {
      if (!this.history || !this.history.length) return
      this.isClearingHistory = true
    },
    disableHistoryClearing() {
      this.isClearingHistory = false
    },
    toggleCollapse() {
      this.showMore = !this.showMore
    },
    toggleStar(entry) {
      if (this.page === "rest") toggleRESTHistoryEntryStar(entry)
      else toggleGraphqlHistoryEntryStar(entry)
    },
  },
}
</script>

<style scoped lang="scss">
.virtual-list {
  max-height: calc(100vh - 270px);
  [readonly] {
    cursor: default;
  }
}
ul,
ol {
  flex-direction: column;
}
@media (max-width: 720px) {
  .virtual-list.filled {
    min-height: 320px;
  }
  .labels {
    display: none;
  }
}
</style>
