<template>
  <virtual-list
    v-if="fb.feedsInFeed.length !== 0"
    class="virtual-list"
    :class="{ filled: fb.feedsInFeed.length }"
    :size="56"
    :remain="Math.min(8, fb.feedsInFeed.length)"
  >
    <ul v-for="feed in fb.feedsInFeed" :key="feed.id">
      <div class="show-on-large-screen">
        <li>
          <input
            :aria-label="$t('label')"
            type="text"
            readonly
            :value="feed.label"
            :placeholder="$t('no_label')"
            class="bg-color"
          />
        </li>
        <button class="icon" @click="saveFeed(feed)">
          <i class="material-icons">get_app</i>
        </button>
        <button class="icon" @click="deleteFeed(feed)">
          <i class="material-icons">delete</i>
        </button>
      </div>
    </ul>
  </virtual-list>
  <ul v-else>
    <li>
      <label class="info">{{ $t("empty") }}</label>
    </li>
  </ul>
</template>

<style scoped lang="scss">
.virtual-list {
  max-height: calc(100vh - 288px);
}

.bg-color {
  background-color: transparent;
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
      this.$toast.error(this.$t("deleted"), {
        icon: "delete"
      });
    },
    saveFeed(feed) {
      const dataToWrite = JSON.stringify(feed.message, null, 2);
      const file = new Blob([dataToWrite], { type: "application/json" });
      const a = document.createElement("a"),
        url = URL.createObjectURL(file);
      a.href = url;
      a.download = (feed.label + " on " + Date()).replace(/\./g, "[dot]");
      document.body.appendChild(a);
      a.click();
      this.$toast.success(this.$t("download_started"), {
        icon: "done"
      });
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 1000);
    }
  }
};
</script>
