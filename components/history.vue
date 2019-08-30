<template>
  <pw-section class="gray" label="History">
    <ul>
      <li id="filter-history">
        <label for="filter-history-input">Filter History</label>
        <input id="filter-history-input" type="text"
               :disabled="history.length === 0 || isClearingHistory"
               v-model="filterText">
      </li>
    </ul>
    <ul>
      <li id="clear-history">
        <button
          id="clear-history-button"
          :class="{ disabled: history.length === 0 }"
          @click="enableHistoryClearing"
          v-if="!isClearingHistory">
          Clear History
        </button>
        <template v-else>
          <label for="clear-history-button">Are you sure?</label>
          <button
            id="confirm-clear-history-button"
            @click="clearHistory">
            Yes
          </button>
          <button
            id="reject-clear-history-button"
            @click="disableHistoryClearing">
            No
          </button>
        </template>
      </li>
    </ul>
    <virtual-list class="virtual-list" :size="89" :remain="Math.min(5, filteredHistory.length)">
      <ul v-for="entry in filteredHistory" :key="entry.millis" class="entry">
        <li>
          <label :for="'time#' + entry.millis">Time</label>
          <input :id="'time#' + entry.millis" type="text" readonly :value="entry.time" :title="entry.date">
        </li>
        <li class="method-list-item">
          <label :for="'time#' + entry.millis">Method</label>
          <input :id="'method#' + entry.millis" type="text" readonly
                 :value="entry.method"
                 :class="findEntryStatus(entry).className"
                 :style="{'--status-code': entry.status}">
          <span class="entry-status-code">{{entry.status}}</span>
        </li>
        <li>
          <label :for="'url#' + entry.millis">URL</label>
          <input :id="'url#' + entry.millis" type="text" readonly :value="entry.url">
        </li>
        <li>
          <label :for="'path#' + entry.millis">Path</label>
          <input :id="'path#' + entry.millis" type="text" readonly :value="entry.path">
        </li>
        <li>
          <label :for="'delete-button#' + entry.millis" class="hide-on-small-screen">&nbsp;</label>
          <button :id="'delete-button#' + entry.millis"
                  :disabled="isClearingHistory"
                  @click="deleteHistory(entry)">
            Delete
          </button>
        </li>
        <li>
          <label :for="'use-button#' + entry.millis" class="hide-on-small-screen">&nbsp;</label>
          <button :id="'use-button#' + entry.millis"
                  :disabled="isClearingHistory"
                  @click="useHistory(entry)">
            Use
          </button>
        </li>
      </ul>
    </virtual-list>
  </pw-section>
</template>

<script>
		import VirtualList from 'vue-virtual-scroll-list'
		import section from "./section";
		import {findStatusGroup} from "../pages/index";

		const updateOnLocalStorage = (propertyName, property) => window.localStorage.setItem(propertyName, JSON.stringify(property));

		export default {
				components: {'pw-section': section, VirtualList},
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
								return foundStatusGroup || {className: ''};
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
								this.isClearingHistory = true;
						},
						disableHistoryClearing() {
								this.isClearingHistory = false;
						}
				}
		}
</script>

<style scoped lang="scss">
  #filter-history {
    display: flex;
    flex-direction: row;

    label {
      flex-basis: 20%;
      display: flex;
      align-items: center;
    }
  }

  #clear-history {
    flex-direction: row;
    justify-content: flex-end;

    #clear-history-button {
      flex: 1;
    }

    label {
      flex: 1;
    }

    #confirm-clear-history-button, #reject-clear-history-button {
      flex-basis: 10%;
    }
  }

  .virtual-list {
    [readonly] {
      cursor: default;
    }
  }
</style>
