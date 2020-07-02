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
  margin: 4px;
  padding: 8px 16px;
  width: calc(100% - 8px);
  border-radius: 8px;
  background-color: var(--bg-dark-color);
  color: var(--fg-color);
  height: 256px;
  overflow: auto;

  &,
  span {
    font-size: 16px;
    font-family: "Roboto Mono", monospace;
    font-weight: 400;
    user-select: text;
  }

  span {
    display: block;
    white-space: pre-wrap;
    word-wrap: break-word;
    word-break: break-all;
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
