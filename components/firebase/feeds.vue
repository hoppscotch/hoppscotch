<template>
  <div v-if="fb.currentFeeds.length !== 0" class="virtual-list">
    <ul v-for="feed in fb.currentFeeds" :key="feed.id" class="entry">
      <div class="show-on-large-screen">
        <li class="info">
          <label>
            {{ feed.label || $t("no_label") }}
          </label>
        </li>
        <button class="icon" @click="deleteFeed(feed)">
          <deleteIcon class="material-icons" />
        </button>
      </div>
      <div class="show-on-large-screen">
        <li class="info clamb-3">
          <label>{{ feed.message || $t("empty") }}</label>
        </li>
      </div>
    </ul>
  </div>
  <ul v-else>
    <li>
      <label class="info">{{ $t("empty") }}</label>
    </li>
  </ul>
</template>

<style scoped lang="scss">
.virtual-list {
  max-height: calc(100vh - 298px);
}

ul,
ol {
  @apply flex-col;
}

.entry {
  @apply border-b;
  @apply border-brdColor;
  @apply border-dashed;
  @apply pb-2;
}

.clamb-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
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
    deleteFeed(feed) {
      fb.deleteFeed(feed.id)
      this.$toast.error(this.$t("deleted"), {
        icon: "delete",
      })
    },
  },
}
</script>
