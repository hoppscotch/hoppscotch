<template>
  <virtual-list
    class="virtual-list"
    :class="{ filled: store.feedsInFeed.length }"
    :size="56"
    :remain="Math.min(5, store.feedsInFeed.length)"
  >
    <ul v-for="feed in store.feedsInFeed" :key="feed.id">
      <li>{{ feed.message }}</li>
      <button class="icon" @click="deleteFeed(feed)">
        <i class="material-icons">delete</i>
      </button>
    </ul>
  </virtual-list>
</template>

<style scoped lang="scss">
.virtual-list {
  max-height: calc(100vh - 284px);
}
</style>

<script>
import { store } from "../../functions/store";

export default {
  components: {
    VirtualList: () => import("vue-virtual-scroll-list")
  },
  data() {
    return {
      store
    };
  },
  methods: {
    deleteFeed(feed) {
      store.deleteFeed(feed.id);
    }
  }
};
</script>
