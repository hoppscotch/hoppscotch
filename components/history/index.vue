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
        <v-popover>
          <button v-if="this.page == 'rest'" class="tooltip-target icon" v-tooltip="$t('sort')">
            <i class="material-icons">sort</i>
          </button>
          <template slot="popover">
            <div>
              <button class="icon" @click="sort_by_label()" v-close-popover>
                <i class="material-icons">sort_by_alpha</i>
                <span>{{ $t("label") }}</span>
              </button>
            </div>
            <div>
              <button class="icon" @click="sort_by_time()" v-close-popover>
                <i class="material-icons">access_time</i>
                <span>{{ $t("time") }}</span>
              </button>
            </div>
            <div>
              <button class="icon" @click="sort_by_status_code()" v-close-popover>
                <i class="material-icons">assistant</i>
                <span>{{ $t("status") }}</span>
              </button>
            </div>
            <div>
              <button class="icon" @click="sort_by_url()" v-close-popover>
                <i class="material-icons">language</i>
                <span>{{ $t("url") }}</span>
              </button>
            </div>
            <div>
              <button class="icon" @click="sort_by_path()" v-close-popover>
                <i class="material-icons">timeline</i>
                <span>{{ $t("path") }}</span>
              </button>
            </div>
            <div v-if="showMore">
              <button class="icon" @click="sort_by_duration()" v-close-popover>
                <i class="material-icons">timer</i>
                <span>{{ $t("duration") }}</span>
              </button>
            </div>
            <div>
              <button class="icon" @click="toggleCollapse()">
                <i class="material-icons">
                  {{ !showMore ? "first_page" : "last_page" }}
                </i>
                <span>{{ !showMore ? $t("show_more") : $t("hide_more") }}</span>
              </button>
            </div>
          </template>
        </v-popover>
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
.fade-enter-active,
.fade-leave-active {
  transition: all 0.2s;
}
.fade-enter,
.fade-leave-to {
  opacity: 0;
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
      reverse_sort_label: false,
      reverse_sort_time: false,
      reverse_sort_status_code: false,
      reverse_sort_url: false,
      reverse_sort_path: false,
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
    sort_by_time() {
      let byDate = this.history.slice(0)
      byDate.sort((a, b) => {
        let date_a = a.date.split("/")
        let date_b = b.date.split("/")
        let time_a = a.time.split(":")
        let time_b = b.time.split(":")
        let final_a = new Date(date_a[2], date_a[1], date_a[0], time_a[0], time_a[1], time_a[2])
        let final_b = new Date(date_b[2], date_b[1], date_b[0], time_b[0], time_b[1], time_b[2])
        if (this.reverse_sort_time) return final_b - final_a
        else return final_a - final_b
      })
      this.history = byDate
      this.reverse_sort_time = !this.reverse_sort_time
    },
    sort_by_status_code() {
      let byCode = this.history.slice(0)
      byCode.sort((a, b) => {
        if (this.reverse_sort_status_code) return b.status - a.status
        else return a.status - b.status
      })
      this.history = byCode
      this.reverse_sort_status_code = !this.reverse_sort_status_code
    },
    sort_by_url() {
      let byUrl = this.history.slice(0)
      byUrl.sort((a, b) => {
        if (this.reverse_sort_url) return a.url === b.url ? 0 : +(a.url < b.url) || -1
        else return a.url === b.url ? 0 : +(a.url > b.url) || -1
      })
      this.history = byUrl
      this.reverse_sort_url = !this.reverse_sort_url
    },
    sort_by_label() {
      let byLabel = this.history.slice(0)
      byLabel.sort((a, b) => {
        if (this.reverse_sort_label) return a.label === b.label ? 0 : +(a.label < b.label) || -1
        else return a.label === b.label ? 0 : +(a.label > b.label) || -1
      })
      this.history = byLabel
      this.reverse_sort_label = !this.reverse_sort_label
    },
    sort_by_path() {
      let byPath = this.history.slice(0)
      byPath.sort((a, b) => {
        if (this.reverse_sort_path) return a.path === b.path ? 0 : +(a.path < b.path) || -1
        else return a.path === b.path ? 0 : +(a.path > b.path) || -1
      })
      this.history = byPath
      this.reverse_sort_path = !this.reverse_sort_path
    },
    sort_by_duration() {
      let byDuration = this.history.slice(0)
      byDuration.sort((a, b) => {
        if (this.reverse_sort_duration)
          return a.duration === b.duration ? 0 : +(a.duration < b.duration) || -1
        else return a.duration === b.duration ? 0 : +(a.duration > b.duration) || -1
      })
      this.history = byDuration
      this.reverse_sort_duration = !this.reverse_sort_duration
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
