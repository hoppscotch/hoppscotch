<template>
  <pw-section class="gray" label="History">
    <ul>
      <li id="filter-history">
        <input aria-label="Search" type="text" placeholder="search history" :readonly="history.length === 0" v-model="filterText">
      </li>
    </ul>
    <ul>
      <li @click="sort_by_time()">
        <label for="" class="flex-wrap">Time<i class="material-icons">sort</i></label>
      </li>
      <li @click="sort_by_status_code()">
        <label for="" class="flex-wrap">Status Code<i class="material-icons">sort</i></label>
      </li>
      <li @click="sort_by_url()">
        <label for="" class="flex-wrap">URL<i class="material-icons">sort</i></label>
      </li>
      <li @click="sort_by_path()">
        <label for="" class="flex-wrap">Path<i class="material-icons">sort</i></label>
      </li>
    </ul>
    <virtual-list class="virtual-list" :class="{filled: filteredHistory.length}" :size="54" :remain="Math.min(5, filteredHistory.length)">
      <ul v-for="(entry, index) in filteredHistory" :key="index" class="entry">
        <li>
          <input aria-label="Time" type="text" readonly :value="entry.time" :title="entry.date">
        </li>
        <li class="method-list-item">
          <input aria-label="Method" type="text" readonly :value="entry.method" :class="findEntryStatus(entry).className" :style="{'--status-code': entry.status}">
          <span class="entry-status-code" :class="findEntryStatus(entry).className" :style="{'--status-code': entry.status}">{{entry.status}}</span>
        </li>
        <li>
          <input aria-label="URL" type="text" readonly :value="entry.url">
        </li>
        <li>
          <input aria-label="Path" type="text" readonly :value="entry.path">
        </li>
        <div class="show-on-small-screen">
          <li>
            <button class="icon" :id="'delete-button#'+index" @click="deleteHistory(entry)" aria-label="Delete">
              <i class="material-icons">delete</i>
            </button>
          </li>
          <li>
            <button class="icon" :id="'use-button#'+index" @click="useHistory(entry)" aria-label="Edit">
              <i class="material-icons">edit</i>
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
        <button class="icon" id="clear-history-button" :disabled="history.length === 0" @click="enableHistoryClearing">
          <i class="material-icons">clear_all</i>
          <span>Clear All</span>
        </button>
      </li>
      <li v-else>
        <div class="flex-wrap">
          <label for="clear-history-button">Are you sure?</label>
          <div>
            <button class="icon" id="confirm-clear-history-button" @click="clearHistory">
              Yes
            </button>
            <button class="icon" id="reject-clear-history-button" @click="disableHistoryClearing">
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
        isClearingHistory: false,
        reverse_sort_time: false,
        reverse_sort_status_code: false,
        reverse_sort_url: false,
        reverse_sort_path: false
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
        this.$toast.error('History Deleted', {
          icon: 'delete',
          position: 'bottom-center',
          duration: 1000,
        });
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
        this.$toast.error('Deleted', {
          icon: 'delete',
          position: 'bottom-center',
          duration: 1000,
        });
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
      },
      sort_by_time() {
        let byDate = this.history.slice(0);
        byDate.sort((a,b) =>{
          let date_a = a.date.split("/");
          let date_b = b.date.split("/");
          let time_a = a.time.split(":")
          let time_b = b.time.split(":")
          let final_a = new Date(date_a[2], date_a[1], date_a[0], time_a[0], time_a[1], time_a[2]);
          let final_b = new Date(date_b[2], date_b[1], date_b[0], time_b[0], time_b[1], time_b[2]);
          if(this.reverse_sort_time)
            return final_b - final_a;
          else
            return final_a - final_b;
          })
        this.history = byDate;
        this.reverse_sort_time = !this.reverse_sort_time;
      },
      sort_by_status_code() {
        let byCode = this.history.slice(0);
        byCode.sort((a,b) =>{
          if(this.reverse_sort_status_code)
            return b.status - a.status;
          else
            return a.status - b.status;
          })
        this.history = byCode;
        this.reverse_sort_status_code = !this.reverse_sort_status_code;
      },
      sort_by_url() {
        let byUrl = this.history.slice(0);
        byUrl.sort((a, b)=>{
          if(this.reverse_sort_url)
            return a.url == b.url ? 0 : +(a.url < b.url) || -1;
          else
            return a.url == b.url ? 0 : +(a.url > b.url) || -1;
        });
        this.history = byUrl;
        this.reverse_sort_url = !this.reverse_sort_url;
      },
      sort_by_path() {
        let byPath = this.history.slice(0);
        byPath.sort((a, b)=>{
          if(this.reverse_sort_path)
            return a.path == b.path ? 0 : +(a.path < b.path) || -1;
          else
            return a.path == b.path ? 0 : +(a.path > b.path) || -1;
        });
        this.history = byPath;
        this.reverse_sort_path = !this.reverse_sort_path;
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
      min-height: 200px;
    }
  }

</style>
