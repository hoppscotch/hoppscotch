<template>
  <pw-section class="gray" label="History">
    <ul>
      <li>
        <button :class="{ disabled: history.length === 0 }" v-on:click="clearHistory">Clear History</button>
      </li>
    </ul>
    <virtual-list class="virtual-list" :size="89" :remain="Math.min(5, history.length)">
      <ul v-for="entry in history" :key="entry.millis" class="entry">
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
          <button :id="'delete-button#' + entry.millis" @click="deleteHistory(entry)">Delete</button>
        </li>
        <li>
          <label :for="'use-button#' + entry.millis" class="hide-on-small-screen">&nbsp;</label>
          <button :id="'use-button#' + entry.millis" @click="useHistory(entry)">Use</button>
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
						console.log(localStorageHistory);
						return {
								history: localStorageHistory || [],
						}
				},
				methods: {
						clearHistory() {
								this.history = [];
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
								updateOnLocalStorage('history', this.history);
						},
						addEntry(entry) {
								this.history.push(entry);
						}
				}
		}
</script>

<style scoped>

</style>
