<template>
  <AppSection label="history">
    <div class="flex">
      <input
        v-model="filterText"
        aria-label="Search"
        type="search"
        :placeholder="$t('search')"
        class="input rounded-t-lg"
      />
    </div>
    <div
      class="divide-y overflow-auto divide-dashed divide-divider"
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
    <p :class="{ hidden: filteredHistory.length != 0 || history.length === 0 }">
      {{ $t("nothing_found") }} "{{ filterText }}"
    </p>
    <p v-if="history.length === 0">
      <i class="material-icons">schedule</i> {{ $t("history_empty") }}
    </p>
    <div v-if="history.length !== 0" class="rounded-b-lg bg-primaryDark">
      <div v-if="!isClearingHistory" class="row-wrapper">
        <ButtonSecondary
          data-testid="clear_history"
          :disabled="history.length === 0"
          icon="clear_all"
          :label="$t('clear_all')"
          @click.native="enableHistoryClearing"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          title="{ content: !showMore ? $t('show_more') : $t('hide_more') }"
          icon="!showMore ? 'unfold_more' : 'unfold_less'"
          @click.native="toggleCollapse()"
        />
      </div>
      <div v-else class="row-wrapper">
        <p>
          <i class="material-icons">help_outline</i> {{ $t("are_you_sure") }}
        </p>
        <div>
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="$t('yes')"
            data-testid="confirm_clear_history"
            icon="done"
            @click.native="clearHistory"
          />
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="$t('no')"
            data-testid="reject_clear_history"
            icon="close"
            @click.native="disableHistoryClearing"
          />
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
  deleteRESTHistoryEntry,
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
