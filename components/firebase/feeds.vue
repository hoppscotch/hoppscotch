<template>
  <div v-if="fb.currentFeeds.length !== 0" class="virtual-list">
    <ul
      v-for="feed in fb.currentFeeds"
      :key="feed.id"
      class="flex-col py-2 border-b border-dashed border-brdColor"
    >
      <div data-test="list-item" class="show-on-large-screen">
        <li class="info">
          <label data-test="list-label">
            {{ feed.label || $t("no_label") }}
          </label>
        </li>
        <button class="icon" @click="deleteFeed(feed)">
          <deleteIcon class="material-icons" />
        </button>
      </div>
      <div class="show-on-large-screen">
        <li data-test="list-message" class="info clamb-3">
          <label>{{ feed.message || $t("empty") }}</label>
        </li>
      </div>
    </ul>
  </div>
  <ul v-else class="flex-col">
    <li>
      <label class="info">{{ $t("empty") }}</label>
    </li>
  </ul>
</template>

<style scoped lang="scss">
.virtual-list {
  max-height: calc(100vh - 296px);
}

.clamb-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  @apply overflow-hidden;
}
</style>

<script>
import { fb } from "~/helpers/fb"
import deleteIcon from "~/static/icons/delete-24px.svg?inline"

export default {
  components: { deleteIcon },
  data() {
    return {
      fb,
    }
  },
  methods: {
    async deleteFeed(feed) {
      await fb.deleteFeed(feed.id)
      this.$toast.error(this.$t("deleted"), {
        icon: "delete",
      })
    },
  },
}
</script>
