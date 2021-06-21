<template>
  <div class="flex flex-col">
    <label for="log">{{ title }}</label>
    <div ref="log" name="log" class="realtime-log">
      <span v-if="log">
        <span
          v-for="(logEntry, index) in log"
          :key="index"
          :style="{ color: logEntry.color }"
          >@ {{ logEntry.ts }}{{ getSourcePrefix(logEntry.source)
          }}{{ logEntry.payload }}</span
        >
      </span>
      <span v-else>{{ $t("waiting_for_connection") }}</span>
    </div>
  </div>
</template>

<script>
import { getSourcePrefix } from "~/helpers/utils/string"

export default {
  props: {
    log: { type: Array, default: () => [] },
    title: {
      type: String,
      default: "",
    },
  },
  updated() {
    this.$nextTick(function () {
      if (this.$refs.log) {
        this.$refs.log.scrollBy(0, this.$refs.log.scrollHeight + 100)
      }
    })
  },
  methods: {
    getSourcePrefix,
  },
}
</script>

<style scoped lang="scss">
.realtime-log {
  @apply p-4;
  @apply bg-primaryDark;
  @apply text-secondary;
  @apply overflow-auto;

  height: 256px;

  &,
  span {
    @apply font-mono;
    @apply select-text;
  }

  span {
    @apply block;
    @apply break-words;
    @apply break-all;
  }
}
</style>
