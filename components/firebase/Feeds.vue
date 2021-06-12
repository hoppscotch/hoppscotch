<template>
  <div
    v-if="fb.currentFeeds.length !== 0"
    class="divide-y virtual-list divide-dashed divide-divider"
  >
    <ul v-for="feed in fb.currentFeeds" :key="feed.id" class="flex-col">
      <div data-test="list-item" class="show-on-large-screen">
        <li class="info">
          <label data-test="list-label" class="break-all">
            {{ feed.label || $t("no_label") }}
          </label>
        </li>
        <button class="icon" @click="deleteFeed(feed)">
          <i class="material-icons">delete</i>
        </button>
      </div>
      <div class="show-on-large-screen">
        <li data-test="list-message" class="info clamb-3">
          <label class="break-all">{{ feed.message || $t("empty") }}</label>
        </li>
      </div>
    </ul>
  </div>
  <ul v-else class="flex-col">
    <li>
      <p class="info">{{ $t("empty") }}</p>
    </li>
  </ul>
</template>

<script>
import { fb } from "~/helpers/fb"

export default {
  data() {
    return {
      fb,
    }
  },
  methods: {
    async deleteFeed({ id }) {
      await fb.deleteFeed(id)
      this.$toast.error(this.$t("deleted"), {
        icon: "delete",
      })
    },
  },
}
</script>

<style scoped lang="scss">
.virtual-list {
  max-height: calc(100vh - 270px);
}

.clamb-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  @apply overflow-hidden;
}
</style>
