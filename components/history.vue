<template>
  <pw-section class="green" icon="history" label="History" ref="history">
    <ul>
      <li id="filter-history">
        <input
          aria-label="Search"
          type="text"
          placeholder="search history"
          v-model="filterText"
        />
      </li>
    </ul>
    <virtual-list
      class="virtual-list"
      :class="{ filled: filteredHistory.length }"
      :size="185"
      :remain="Math.min(5, filteredHistory.length)"
    >
      <ul v-for="(entry, index) in filteredHistory" :key="index" class="entry">
        <div class="show-on-large-screen">
          <button
            class="icon"
            :class="{ stared: entry.star }"
            @click="toggleStar(index)"
            v-tooltip="{ content: !entry.star ? 'Add star' : 'Remove star' }"
          >
            <i class="material-icons">
              {{ entry.star ? "star" : "star_border" }}
            </i>
          </button>
          <li>
            <input
              aria-label="Label"
              type="text"
              readonly
              :value="entry.label"
              placeholder="No label"
              class="bg-color"
            />
          </li>
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
            <button class="tooltip-target icon" v-tooltip="'Options'">
              <i class="material-icons">more_vert</i>
            </button>
            <template slot="popover">
              <div>
                <button
                  class="icon"
                  :id="'use-button#' + index"
                  @click="useHistory(entry)"
                  aria-label="Edit"
                  v-close-popover
                >
                  <i class="material-icons">restore</i>
                  <span>Restore</span>
                </button>
              </div>
              <div>
                <button
                  class="icon"
                  :id="'delete-button#' + index"
                  @click="deleteHistory(entry)"
                  aria-label="Delete"
                  v-close-popover
                >
                  <i class="material-icons">delete</i>
                  <span>Delete</span>
                </button>
              </div>
            </template>
          </v-popover>
        </div>
        <div class="show-on-large-screen">
          <li class="method-list-item">
            <input
              aria-label="Method"
              type="text"
              readonly
              :value="entry.method"
              :class="findEntryStatus(entry).className"
              :style="{ '--status-code': entry.status }"
            />
            <span
              class="entry-status-code"
              :class="findEntryStatus(entry).className"
              :style="{ '--status-code': entry.status }"
              >{{ entry.status }}</span
            >
          </li>
        </div>
        <div class="show-on-large-screen">
          <li>
            <input
              aria-label="URL"
              type="text"
              readonly
              :value="entry.url"
              placeholder="No URL"
            />
          </li>
          <li>
            <input
              aria-label="Path"
              type="text"
              readonly
              :value="entry.path"
              placeholder="No path"
            />
          </li>
        </div>
        <transition name="fade">
          <div v-if="showMore" class="show-on-large-screen">
            <li>
              <input
                aria-label="Time"
                type="text"
                readonly
                :value="entry.time"
                v-tooltip="entry.date"
              />
            </li>
            <li>
              <input
                aria-label="Duration"
                type="text"
                readonly
                :value="entry.duration"
                placeholder="No duration"
              />
            </li>
            <li>
              <input
                aria-label="Pre Request Script"
                type="text"
                readonly
                :value="entry.preRequestScript"
                placeholder="No pre request script"
              />
            </li>
          </div>
        </transition>
      </ul>
    </virtual-list>
    <ul
      :class="{ hidden: filteredHistory.length != 0 || history.length === 0 }"
    >
      <li>
        <label>Nothing found "{{ filterText }}"</label>
      </li>
    </ul>
    <ul v-if="history.length === 0">
      <li>
        <label>History is empty</label>
      </li>
    </ul>
    <div v-if="history.length !== 0">
      <div class="flex-wrap" v-if="!isClearingHistory">
        <button
          class="icon"
          id="clear-history-button"
          :disabled="history.length === 0"
          @click="enableHistoryClearing"
        >
          <i class="material-icons">clear_all</i>
          <span>Clear All</span>
        </button>
        <v-popover>
          <button class="tooltip-target icon" v-tooltip="'Sort'">
            <i class="material-icons">sort</i>
          </button>
          <template slot="popover">
            <div>
              <button class="icon" @click="sort_by_label()" v-close-popover>
                <i class="material-icons">sort_by_alpha</i>
                <span>Label</span>
              </button>
            </div>
            <div>
              <button class="icon" @click="sort_by_time()" v-close-popover>
                <i class="material-icons">access_time</i>
                <span>Time</span>
              </button>
            </div>
            <div>
              <button
                class="icon"
                @click="sort_by_status_code()"
                v-close-popover
              >
                <i class="material-icons">assistant</i>
                <span>Status</span>
              </button>
            </div>
            <div>
              <button class="icon" @click="sort_by_url()" v-close-popover>
                <i class="material-icons">language</i>
                <span>URL</span>
              </button>
            </div>
            <div>
              <button class="icon" @click="sort_by_path()" v-close-popover>
                <i class="material-icons">timeline</i>
                <span>Path</span>
              </button>
            </div>
            <div v-if="showMore">
              <button class="icon" @click="sort_by_duration()" v-close-popover>
                <i class="material-icons">timer</i>
                <span>Duration</span>
              </button>
            </div>
            <div>
              <button class="icon" @click="toggleCollapse()">
                <i class="material-icons">
                  {{ !showMore ? "first_page" : "last_page" }}
                </i>
                <span>{{ !showMore ? "Show more" : "Hide more" }}</span>
              </button>
            </div>
          </template>
        </v-popover>
      </div>
      <div class="flex-wrap" v-else>
        <label for="clear-history-button">Are you sure?</label>
        <div>
          <button
            class="icon"
            id="confirm-clear-history-button"
            @click="clearHistory"
            v-tooltip="'Yes'"
          >
            <i class="material-icons">done</i>
          </button>
          <button
            class="icon"
            id="reject-clear-history-button"
            @click="disableHistoryClearing"
            v-tooltip="'No'"
          >
            <i class="material-icons">close</i>
          </button>
        </div>
      </div>
    </div>
  </pw-section>
</template>

<style scoped lang="scss">
.virtual-list {
  max-height: calc(100vh - 284px);

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

ul li,
ol li {
  display: flex;
}

.method-list-item {
  position: relative;

  span {
    position: absolute;
    top: 10px;
    right: 10px;
    font-family: "Roboto Mono", monospace;
    background-color: var(--bg-color);
    padding: 2px 6px;
    border-radius: 8px;
  }
}

.entry {
  border-bottom: 1px solid var(--brd-color);
  padding: 16px 0;
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
import { findStatusGroup } from "../pages/index";

const updateOnLocalStorage = (propertyName, property) =>
  window.localStorage.setItem(propertyName, JSON.stringify(property));

export default {
  components: {
    "pw-section": () => import("./section"),
    VirtualList: () => import("vue-virtual-scroll-list")
  },
  data() {
    const localStorageHistory = JSON.parse(
      window.localStorage.getItem("history")
    );
    return {
      history: localStorageHistory || [],
      filterText: "",
      showFilter: false,
      isClearingHistory: false,
      reverse_sort_label: false,
      reverse_sort_time: false,
      reverse_sort_status_code: false,
      reverse_sort_url: false,
      reverse_sort_path: false,
      showMore: false
    };
  },
  computed: {
    filteredHistory() {
      return this.history.filter(entry => {
        const filterText = this.filterText.toLowerCase();
        return Object.keys(entry).some(key => {
          let value = entry[key];
          value = typeof value !== "string" ? value.toString() : value;
          return value.toLowerCase().includes(filterText);
        });
      });
    }
  },
  methods: {
    clearHistory() {
      this.history = [];
      this.filterText = "";
      this.disableHistoryClearing();
      updateOnLocalStorage("history", this.history);
      this.$toast.error("History Deleted", {
        icon: "delete"
      });
    },
    useHistory(entry) {
      this.$emit("useHistory", entry);
    },
    findEntryStatus(entry) {
      const foundStatusGroup = findStatusGroup(entry.status);
      return (
        foundStatusGroup || {
          className: ""
        }
      );
    },
    deleteHistory(entry) {
      this.history.splice(this.history.indexOf(entry), 1);
      if (this.history.length === 0) {
        this.filterText = "";
      }
      updateOnLocalStorage("history", this.history);
      this.$toast.error("Deleted", {
        icon: "delete"
      });
    },
    addEntry(entry) {
      this.history.push(entry);
      updateOnLocalStorage("history", this.history);
    },
    enableHistoryClearing() {
      if (!this.history || !this.history.length) return;
      this.isClearingHistory = true;
    },
    disableHistoryClearing() {
      this.isClearingHistory = false;
    },
    sort_by_time() {
      let byDate = this.history.slice(0);
      byDate.sort((a, b) => {
        let date_a = a.date.split("/");
        let date_b = b.date.split("/");
        let time_a = a.time.split(":");
        let time_b = b.time.split(":");
        let final_a = new Date(
          date_a[2],
          date_a[1],
          date_a[0],
          time_a[0],
          time_a[1],
          time_a[2]
        );
        let final_b = new Date(
          date_b[2],
          date_b[1],
          date_b[0],
          time_b[0],
          time_b[1],
          time_b[2]
        );
        if (this.reverse_sort_time) return final_b - final_a;
        else return final_a - final_b;
      });
      this.history = byDate;
      this.reverse_sort_time = !this.reverse_sort_time;
    },
    sort_by_status_code() {
      let byCode = this.history.slice(0);
      byCode.sort((a, b) => {
        if (this.reverse_sort_status_code) return b.status - a.status;
        else return a.status - b.status;
      });
      this.history = byCode;
      this.reverse_sort_status_code = !this.reverse_sort_status_code;
    },
    sort_by_url() {
      let byUrl = this.history.slice(0);
      byUrl.sort((a, b) => {
        if (this.reverse_sort_url)
          return a.url == b.url ? 0 : +(a.url < b.url) || -1;
        else return a.url == b.url ? 0 : +(a.url > b.url) || -1;
      });
      this.history = byUrl;
      this.reverse_sort_url = !this.reverse_sort_url;
    },
    sort_by_label() {
      let byLabel = this.history.slice(0);
      byLabel.sort((a, b) => {
        if (this.reverse_sort_label)
          return a.label == b.label ? 0 : +(a.label < b.label) || -1;
        else return a.label == b.label ? 0 : +(a.label > b.label) || -1;
      });
      this.history = byLabel;
      this.reverse_sort_label = !this.reverse_sort_label;
    },
    sort_by_path() {
      let byPath = this.history.slice(0);
      byPath.sort((a, b) => {
        if (this.reverse_sort_path)
          return a.path == b.path ? 0 : +(a.path < b.path) || -1;
        else return a.path == b.path ? 0 : +(a.path > b.path) || -1;
      });
      this.history = byPath;
      this.reverse_sort_path = !this.reverse_sort_path;
    },
    sort_by_duration() {
      let byDuration = this.history.slice(0);
      byDuration.sort((a, b) => {
        if (this.reverse_sort_duration)
          return a.duration == b.duration
            ? 0
            : +(a.duration < b.duration) || -1;
        else
          return a.duration == b.duration
            ? 0
            : +(a.duration > b.duration) || -1;
      });
      this.history = byDuration;
      this.reverse_sort_duration = !this.reverse_sort_duration;
    },
    toggleCollapse() {
      this.showMore = !this.showMore;
    },
    toggleStar(index) {
      this.history[index]["star"] = !this.history[index]["star"];
      updateOnLocalStorage("history", this.history);
    }
  }
};
</script>
