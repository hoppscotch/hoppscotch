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
    <div ref="logsRef" name="log" class="realtime-log">
      <span v-if="log" class="space-y-2">
        <span
          v-for="(entry, index) in log"
          :key="`entry-${index}`"
          :style="{ color: entry.color }"
          >{{ entry.ts }}{{ source(entry.source) }}{{ entry.payload }}</span
        >
      </span>
      <span v-else>{{ t("response.waiting_for_connection") }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from "@nuxtjs/composition-api"
import { getSourcePrefix as source } from "~/helpers/utils/string"
import { useI18n } from "~/helpers/utils/composables"

const t = useI18n()

const props = defineProps({
  log: { type: Array, default: () => [] },
  title: {
    type: String,
    default: "",
  },
})

const logsRef = ref<any | null>(null)
const BOTTOM_SCROLL_DIST_INNACURACY = 5

watch(
  () => props.log,
  () => {
    if (!logsRef.value) return
    const distToBottom =
      logsRef.value.scrollHeight -
      logsRef.value.scrollTop -
      logsRef.value.clientHeight
    if (distToBottom < BOTTOM_SCROLL_DIST_INNACURACY) {
      nextTick(() => (logsRef.value.scrollTop = logsRef.value.scrollHeight))
    }
  }
)
</script>

<style scoped lang="scss">
.realtime-log {
  @apply p-4;
  @apply bg-transparent;
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
