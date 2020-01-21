<template>
  <virtual-list
    class="virtual-list"
    :class="{ filled: fb.feedsInFeed.length }"
    :size="56"
    :remain="Math.min(5, fb.feedsInFeed.length)"
  >
    <ul v-for="feed in fb.feedsInFeed" :key="feed.id">
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
import { fb } from "../../functions/fb";

export default {
  components: {
    VirtualList: () => import("vue-virtual-scroll-list")
  },
  data() {
    return {
      fb
    };
  },
  methods: {
    deleteFeed(feed) {
      fb.deleteFeed(feed.id);
    }
  }
};
</script>
