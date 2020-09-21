<template>
  <div>
    <label for="log">{{ title }}</label>
    <div name="log" class="realtime-log" ref="log">
      <span v-if="log">
        <span v-for="(logEntry, index) in log" :style="{ color: logEntry.color }" :key="index"
          >@ {{ logEntry.ts }}{{ getSourcePrefix(logEntry.source) }}{{ logEntry.payload }}</span
        >
      </span>
      <span v-else>{{ $t("waiting_for_connection") }}</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
div.realtime-log {
  @apply m-2;
  @apply px-4;
  @apply py-8;
  width: calc(100% - 8px);
  @apply rounded-lg;
  @apply bg-bgDarkColor;
  @apply text-fgColor;
  height: 256px;
  @apply overflow-auto;

  &,
  span {
    @apply text-sm;
    @apply font-mono;
    @apply font-normal;
    @apply select-text;
  }

  span {
    @apply block;
    @apply whitespace-pre-wrap;
    @apply break-words;
    @apply break-all;
  }
}
</style>

<script>
import { getSourcePrefix } from "~/helpers/utils/string"

export default {
  props: ["log", "title"],
  methods: {
    getSourcePrefix,
  },
  updated: function () {
    this.$nextTick(function () {
      if (this.$refs.log) {
        this.$refs.log.scrollBy(0, this.$refs.log.scrollHeight + 100)
      }
    })
  },
}
</script>
