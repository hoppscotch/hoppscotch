<template>
  <pw-section class="green" icon="history" :label="$t('history')" ref="history">
    <div class="show-on-large-screen">
      <input aria-label="Search" type="search" :placeholder="$t('search')" v-model="filterText" />
      <button class="icon">
        <i class="material-icons">search</i>
      </button>
    </div>
    <div class="virtual-list" :class="{ filled: filteredHistory.length }">
      <ul v-for="(entry, index) in filteredHistory" :key="index" class="entry">
        <div class="show-on-large-screen">
          <span
            class="p-2 m-2"
            :class="findEntryStatus(entry).className"
            :style="{ '--status-code': entry.status }"
          >
            {{ `${entry.method} \xA0 • \xA0 ${entry.status}` }}
          </span>
          <li>
            <input
              :aria-label="$t('token_req_name')"
              type="text"
              readonly
              :value="entry.name"
              :placeholder="$t('empty_req_name')"
              class="bg-transparent"
            />
          </li>
          <button
            class="icon"
            :class="{ stared: entry.star }"
            @click="toggleStar(entry)"
            v-tooltip="{
              content: !entry.star ? $t('add_star') : $t('remove_star'),
            }"
          >
            <i class="material-icons">
              {{ entry.star ? "star" : "star_border" }}
            </i>
          </button>
          <!-- <li>
            <button
              class="icon"
              v-tooltip="{
                content: !entry.usesScripts
                  ? 'No pre-request script'
                  : 'Used pre-request script'
              }"
            >
              <i class="material-icons">
                {{ !entry.usesScripts ? "http" : "code" }}
              </i>
            </button>
          </li> -->
          <v-popover>
            <button class="tooltip-target icon" v-tooltip="$t('options')">
              <i class="material-icons">more_vert</i>
            </button>
            <template slot="popover">
              <div>
                <button
                  class="icon"
                  :id="'use-button#' + index"
                  @click="useHistory(entry)"
                  :aria-label="$t('edit')"
                  v-close-popover
                >
                  <i class="material-icons">restore</i>
                  <span>{{ $t("restore") }}</span>
                </button>
              </div>
              <div>
                <button
                  class="icon"
                  :id="'delete-button#' + index"
                  @click="deleteHistory(entry)"
                  :aria-label="$t('delete')"
                  v-close-popover
                >
                  <deleteIcon class="material-icons" />
                  <span>{{ $t("delete") }}</span>
                </button>
              </div>
            </template>
          </v-popover>
        </div>
        <div class="show-on-large-screen">
          <li>
            <input
              :aria-label="$t('url')"
              type="text"
              readonly
              :value="`${entry.url}${entry.path}`"
              :placeholder="$t('no_url')"
              class="pt-0 mt-0 text-sm bg-transparent text-fgLightColor"
            />
          </li>
        </div>
        <transition name="fade">
          <div v-if="showMore" class="show-on-large-screen">
            <li>
              <input
                :aria-label="$t('time')"
                type="text"
                readonly
                :value="entry.time"
                v-tooltip="entry.date"
              />
            </li>
            <li>
              <input
                :aria-label="$t('duration')"
                type="text"
                readonly
                :value="entry.duration"
                :placeholder="$t('no_duration')"
              />
            </li>
            <li>
              <input
                :aria-label="$t('prerequest_script')"
                type="text"
                readonly
                :value="entry.preRequestScript"
                :placeholder="$t('no_prerequest_script')"
              />
            </li>
          </div>
        </transition>
      </ul>
    </div>
    <ul :class="{ hidden: filteredHistory.length != 0 || history.length === 0 }">
      <li>
        <label>{{ $t("nothing_found") }} "{{ filterText }}"</label>
      </li>
    </ul>
    <p v-if="history.length === 0" class="info">
      <i class="material-icons">schedule</i> {{ $t("history_empty") }}
    </p>
    <div v-if="history.length !== 0">
      <div class="row-wrapper" v-if="!isClearingHistory">
        <button
          class="icon"
          id="clear-history-button"
          :disabled="history.length === 0"
          @click="enableHistoryClearing"
        >
          <i class="material-icons">clear_all</i>
          <span>{{ $t("clear_all") }}</span>
        </button>
        <v-popover>
          <button class="tooltip-target icon" v-tooltip="$t('sort')">
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
        <label for="clear-history-button" class="info">
          <i class="material-icons">help_outline</i> {{ $t("are_you_sure") }}
        </label>
        <div>
          <button
            class="icon"
            id="confirm-clear-history-button"
            @click="clearHistory"
            v-tooltip="$t('yes')"
          >
            <i class="material-icons">done</i>
          </button>
          <button
            class="icon"
            id="reject-clear-history-button"
            @click="disableHistoryClearing"
            v-tooltip="$t('no')"
          >
            <closeIcon class="material-icons" />
          </button>
        </div>
      </div>
    </div>
  </pw-section>
</template>

<style scoped lang="scss">
.virtual-list {
  max-height: calc(100vh - 290px);

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

.stared {
  color: #f8e81c !important;
}

ul,
ol {
  flex-direction: column;
}

.entry {
  border-bottom: 1px dashed var(--brd-color);
  padding: 0 0 8px;
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
import findStatusGroup from "~/helpers/findStatusGroup"
import { fb } from "~/helpers/fb"
import closeIcon from "~/static/icons/close-24px.svg?inline"
import deleteIcon from "~/static/icons/delete-24px.svg?inline"

const updateOnLocalStorage = (propertyName, property) =>
  window.localStorage.setItem(propertyName, JSON.stringify(property))

export default {
  components: {
    closeIcon,
    deleteIcon,
  },
  data() {
    return {
      history:
        fb.currentUser !== null
          ? fb.currentHistory
          : JSON.parse(window.localStorage.getItem("history")) || [],
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
          ? fb.currentHistory
          : JSON.parse(window.localStorage.getItem("history")) || []
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
        await fb.clearHistory()
      }
      this.history = []
      this.filterText = ""
      this.disableHistoryClearing()
      updateOnLocalStorage("history", this.history)
      this.$toast.error(this.$t("history_deleted"), {
        icon: "delete",
      })
    },
    useHistory(entry) {
      this.$emit("useHistory", entry)
    },
    findEntryStatus({ status }) {
      const foundStatusGroup = findStatusGroup(status)
      return (
        foundStatusGroup || {
          className: "",
        }
      )
    },
    async deleteHistory(entry) {
      if (fb.currentUser !== null) {
        await fb.deleteHistory(entry)
      }
      this.history.splice(this.history.indexOf(entry), 1)
      if (this.history.length === 0) {
        this.filterText = ""
      }
      updateOnLocalStorage("history", this.history)
      this.$toast.error(this.$t("deleted"), {
        icon: "delete",
      })
    },
    addEntry(entry) {
      this.history.push(entry)
      updateOnLocalStorage("history", this.history)
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
        await fb.toggleStar(entry, !entry.star)
      }
      entry.star = !entry.star
      updateOnLocalStorage("history", this.history)
    },
  },
}
</script>
