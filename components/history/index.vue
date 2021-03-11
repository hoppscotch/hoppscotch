<template>
  <AppSection class="green" icon="history" :label="$t('history')" ref="history" no-legend>
    <div class="show-on-large-screen">
      <input
        aria-label="Search"
        type="search"
        :placeholder="$t('search')"
        v-model="filterText"
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
          :entry="entry"
          :id="index"
          :showMore="showMore"
          @toggle-star="toggleStar(entry)"
          @delete-entry="deleteHistory(entry)"
          @use-entry="useHistory(entry)"
        />
        <HistoryGraphqlCard
          v-if="page == 'graphql'"
          :entry="entry"
          :showMore="showMore"
          @toggle-star="toggleStar(entry)"
          @delete-entry="deleteHistory(entry)"
          @use-entry="useHistory(entry)"
        />
      </ul>
    </div>
    <p :class="{ hidden: filteredHistory.length != 0 || history.length === 0 }" class="info">
      {{ $t("nothing_found") }} "{{ filterText }}"
    </p>
    <p v-if="history.length === 0" class="info">
      <i class="material-icons">schedule</i> {{ $t("history_empty") }}
    </p>
    <div v-if="history.length !== 0" class="rounded-b-lg bg-bgDarkColor">
      <div class="row-wrapper" v-if="!isClearingHistory">
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
      <div class="row-wrapper" v-else>
        <p class="info"><i class="material-icons">help_outline</i> {{ $t("are_you_sure") }}</p>
        <div>
          <button
            data-testid="confirm_clear_history"
            class="icon"
            @click="clearHistory"
            v-tooltip="$t('yes')"
          >
            <i class="material-icons">done</i>
          </button>
          <button
            data-testid="reject_clear_history"
            class="icon"
            @click="disableHistoryClearing"
            v-tooltip="$t('no')"
          >
            <i class="material-icons">close</i>
          </button>
        </div>
      </div>
    </div>
  </AppSection>
</template>

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

<script>
import { fb } from "~/helpers/fb"

const updateOnLocalStorage = (propertyName, property) =>
  window.localStorage.setItem(propertyName, JSON.stringify(property))

export default {
  props: {
    page: String,
  },
  data() {
    return {
      history:
        fb.currentUser !== null
          ? fb.currentHistory
          : JSON.parse(
              window.localStorage.getItem(this.page == "rest" ? "history" : "graphqlHistory")
            ) || [],
      filterText: "",
      showFilter: false,
      isClearingHistory: false,
      showMore: false,
    }
  },
  computed: {
    filteredHistory() {
      this.history =
        fb.currentUser !== null
          ? this.page == "rest"
            ? fb.currentHistory
            : fb.currentGraphqlHistory
          : JSON.parse(
              window.localStorage.getItem(this.page == "rest" ? "history" : "graphqlHistory")
            ) || []
      return this.history.filter((entry) => {
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
    async clearHistory() {
      if (fb.currentUser !== null) {
        this.page == "rest" ? await fb.clearHistory() : await fb.clearGraphqlHistory()
      }
      this.history = []
      this.filterText = ""
      this.disableHistoryClearing()
      updateOnLocalStorage(this.page == "rest" ? "history" : "graphqlHistory", this.history)
      this.$toast.error(this.$t("history_deleted"), {
        icon: "delete",
      })
    },
    useHistory(entry) {
      this.$emit("useHistory", entry)
    },
    async deleteHistory(entry) {
      if (this.history.length === 0) {
        this.filterText = ""
      }
      if (fb.currentUser !== null) {
        await (this.page == "rest" ? fb.deleteHistory(entry) : fb.deleteGraphqlHistory(entry))
        this.history = fb.currentHistory
        updateOnLocalStorage(this.page == "rest" ? "history" : "graphqlHistory", this.history)
      } else {
        this.history.splice(this.history.indexOf(entry), 1)
        updateOnLocalStorage(this.page == "rest" ? "history" : "graphqlHistory", this.history)
      }
      this.$toast.error(this.$t("deleted"), {
        icon: "delete",
      })
    },
    addEntry(entry) {
      this.history.push(entry)
      updateOnLocalStorage(this.page == "rest" ? "history" : "graphqlHistory", this.history)
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
    async toggleStar(entry) {
      if (fb.currentUser !== null) {
        this.page == "rest"
          ? await fb.toggleStar(entry, !entry.star)
          : await fb.toggleGraphqlHistoryStar(entry, !entry.star)
      }
      entry.star = !entry.star
      updateOnLocalStorage(this.page == "rest" ? "history" : "graphqlHistory", this.history)
    },
  },
}
</script>
