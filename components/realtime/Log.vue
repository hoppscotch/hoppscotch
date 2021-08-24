<template>
  <div class="flex flex-col">
    <div
      class="
        bg-primary
        border-b border-dividerLight
        flex flex-1
        pl-4
        top-0
        z-10
        sticky
        items-center
        justify-between
      "
    >
      <label for="log" class="font-semibold text-secondaryLight py-2">
        {{ title }}
      </label>
    </div>
    <div ref="log" name="log" class="realtime-log">
      <span v-if="log" class="space-y-2">
        <span
          v-for="(entry, index) in log"
          :key="`entry-${index}`"
          :style="{ color: entry.color }"
          >{{ entry.ts }}{{ getSourcePrefix(entry.source)
          }}{{ entry.payload }}</span
        >
      </span>
      <span v-else>{{ $t("response.waiting_for_connection") }}</span>
    </div>
  </div>
</template>

<script>
import { defineComponent } from "@nuxtjs/composition-api"
import { getSourcePrefix } from "~/helpers/utils/string"

export default defineComponent({
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
})
</script>

<style scoped lang="scss">
.realtime-log {
  @apply p-4;
  @apply bg-primary;
  @apply text-secondary;
  @apply overflow-auto;

  height: 256px;

  &,
  span {
    @apply select-text;
  }

  span {
    @apply block;
    @apply break-words break-all;
  }
}
</style>
