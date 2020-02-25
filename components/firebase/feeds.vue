<template>
  <virtual-list
    v-if="fb.currentFeeds.length !== 0"
    class="virtual-list"
    :class="{ filled: fb.currentFeeds.length }"
    :size="90"
    :remain="Math.min(5, fb.currentFeeds.length)"
  >
    <ul v-for="feed in fb.currentFeeds" :key="feed.id" class="entry">
      <div class="show-on-large-screen">
        <li class="info">
          <label>
            {{ feed.label || $t("no_label") }}
          </label>
        </li>
        <button class="icon" @click="deleteFeed(feed)">
          <i class="material-icons">delete</i>
        </button>
      </div>
      <div class="show-on-large-screen">
        <li class="info clamb-3">
          <label>{{ feed.message || $t("empty") }}</label>
        </li>
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

ul,
ol {
  flex-direction: column;
}

.entry {
  border-bottom: 1px dashed var(--brd-color);
  padding: 0 0 8px;
}

.clamb-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>

<script>
import { fb } from "../../functions/fb"

export default {
  components: {
    VirtualList: () => import("vue-virtual-scroll-list"),
  },
  data() {
    return {
      fb,
    }
  },
  methods: {
    deleteFeed(feed) {
      fb.deleteFeed(feed.id)
      this.$toast.error(this.$t("deleted"), {
        icon: "delete",
      })
    },
  },
}
</script>
