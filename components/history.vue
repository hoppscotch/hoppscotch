<template>
  <pw-section class="gray" label="History">
    <ul>
      <li id="filter-history">
        <input id="filter-history-input" type="text" placeholder="search history" :readonly="history.length === 0 || isClearingHistory" v-model="filterText">
      </li>
    </ul>
    <virtual-list class="virtual-list" :class="{filled: filteredHistory.length}" :size="89" :remain="Math.min(5, filteredHistory.length)">
      <ul v-for="(entry, index) in filteredHistory" :key="index" class="entry">
        <li>
          <label :for="'time#'+index">Time</label>
          <input :id="'time#'+index" type="text" readonly :value="entry.time" :title="entry.date">
        </li>
        <li class="method-list-item">
          <label :for="'time#'+index">Method</label>
          <input :id="'method#'+index" type="text" readonly :value="entry.method" :class="findEntryStatus(entry).className" :style="{'--status-code': entry.status}">
          <span class="entry-status-code">{{entry.status}}</span>
        </li>
        <li>
          <label :for="'url#'+index">URL</label>
          <input :id="'url#'+index" type="text" readonly :value="entry.url">
        </li>
        <li>
          <label :for="'path#'+index">Path</label>
          <input :id="'path#'+index" type="text" readonly :value="entry.path">
        </li>
        <div class="show-on-small-screen">
          <li>
            <label :for="'delete-button#'+index" class="hide-on-small-screen">&nbsp;</label>
            <button class="icon" :id="'delete-button#'+index" :disabled="isClearingHistory" @click="deleteHistory(entry)">
              <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd">
                <path d="M19 24h-14c-1.104 0-2-.896-2-2v-17h-1v-2h6v-1.5c0-.827.673-1.5 1.5-1.5h5c.825 0 1.5.671 1.5 1.5v1.5h6v2h-1v17c0 1.104-.896 2-2 2zm0-19h-14v16.5c0 .276.224.5.5.5h13c.276 0 .5-.224.5-.5v-16.5zm-9 4c0-.552-.448-1-1-1s-1 .448-1 1v9c0 .552.448 1 1 1s1-.448 1-1v-9zm6 0c0-.552-.448-1-1-1s-1 .448-1 1v9c0 .552.448 1 1 1s1-.448 1-1v-9zm-2-7h-4v1h4v-1z"/>
              </svg>
            </button>
          </li>
          <li>
            <label :for="'use-button#'+index" class="hide-on-small-screen">&nbsp;</label>
            <button class="icon" :id="'use-button#'+index" :disabled="isClearingHistory" @click="useHistory(entry)">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <path d="M14.078 7.061l2.861 2.862-10.799 10.798-3.584.723.724-3.585 10.798-10.798zm0-2.829l-12.64 12.64-1.438 7.128 7.127-1.438 12.642-12.64-5.691-5.69zm7.105 4.277l2.817-2.82-5.691-5.689-2.816 2.817 5.69 5.692z" />
              </svg>
            </button>
          </li>
        </div>
      </ul>
    </virtual-list>
    <ul :class="{hidden: filteredHistory.length != 0 || history.length === 0 }">
      <li>
        <label>Nothing found for "{{filterText}}"</label>
      </li>
    </ul>
    <ul>
      <li v-if="!isClearingHistory">
        <button id="clear-history-button" :disabled="history.length === 0" @click="enableHistoryClearing">Clear All</button>
      </li>
      <li v-else>
        <div class="flex-wrap">
          <label for="clear-history-button">Are you sure?</label>
          <div>
            <button id="confirm-clear-history-button" @click="clearHistory">
              Yes
            </button>
            <button id="reject-clear-history-button" @click="disableHistoryClearing">
              No
            </button>
          </div>
        </div>
      </li>
    </ul>
  </pw-section>
</template>
<script>
  import VirtualList from 'vue-virtual-scroll-list'
  import section from "./section";
  import {
    findStatusGroup
  } from "../pages/index";

  const updateOnLocalStorage = (propertyName, property) => window.localStorage.setItem(propertyName, JSON.stringify(property));
  export default {
    components: {
      'pw-section': section,
      VirtualList
    },
    data() {
      const localStorageHistory = JSON.parse(window.localStorage.getItem('history'));
      return {
        history: localStorageHistory || [],
        filterText: '',
        showFilter: false,
        isClearingHistory: false
      }
    },
    computed: {
      filteredHistory() {
        return this.history.filter(entry => {
          const filterText = this.filterText.toLowerCase();
          return Object.keys(entry).some(key => {
            let value = entry[key];
            value = typeof value !== 'string' ? value.toString() : value;
            return value.toLowerCase().includes(filterText);
          });
        });
      }
    },
    methods: {
      clearHistory() {
        this.history = [];
        this.filterText = '';
        this.disableHistoryClearing();
        updateOnLocalStorage('history', this.history);
      },
      useHistory(entry) {
        this.$emit('useHistory', entry);
      },
      findEntryStatus(entry) {
        const foundStatusGroup = findStatusGroup(entry.status);
        return foundStatusGroup || {
          className: ''
        };
      },
      deleteHistory(entry) {
        this.history.splice(this.history.indexOf(entry), 1);
        if (this.history.length === 0) {
          this.filterText = '';
        }
        updateOnLocalStorage('history', this.history);
      },
      addEntry(entry) {
        this.history.push(entry);
        updateOnLocalStorage('history', this.history);
      },
      enableHistoryClearing() {
        if (!this.history || !this.history.length) return;
        this.isClearingHistory = true;
      },
      disableHistoryClearing() {
        this.isClearingHistory = false;
      }
    }
  }

</script>
<style scoped lang="scss">
  .virtual-list {
    [readonly] {
      cursor: default;
    }
  }

  @media (max-width: 720px) {
    .virtual-list.filled {
      min-height: 380px;
    }
  }

</style>
