<template>
  <div ref="container" class="flex flex-col flex-1 overflow-y-auto">
    <div
      class="sticky top-0 z-10 flex items-center justify-between flex-none pl-4 border-b bg-primary border-dividerLight"
    >
      <label for="log" class="py-2 font-semibold text-secondaryLight">
        {{ title }}
      </label>
      <div>
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.delete')"
          svg="trash"
          @click.native="emit('delete')"
        />
        <ButtonSecondary
          id="bottompage"
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.scroll_to_top')"
          svg="arrow-up"
          @click.native="scrollTo('top')"
        />
        <ButtonSecondary
          id="bottompage"
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.scroll_to_bottom')"
          svg="arrow-down"
          @click.native="scrollTo('bottom')"
        />
        <ButtonSecondary
          id="bottompage"
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.autoscroll')"
          svg="chevrons-down"
          :class="toggleAutoscrollColor"
          @click.native="toggleAutoscroll()"
        />
      </div>
    </div>
    <div
      v-if="log.length !== 0"
      ref="logs"
      class="overflow-y-auto border-b border-dividerLight"
    >
      <div
        class="flex flex-col h-auto h-full border-r divide-y divide-dividerLight border-dividerLight"
      >
        <RealtimeLogEntry
          v-for="(entry, index) in log"
          :key="`entry-${index}`"
          :entry="entry"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, PropType, computed, watch } from "@nuxtjs/composition-api"
import { useThrottleFn, useScroll } from "@vueuse/core"
import { useI18n } from "~/helpers/utils/composables"

export type LogEntryData = {
  prefix?: string
  ts: number | undefined
  source: "info" | "client" | "server" | "disconnected"
  payload: string
  event: "connecting" | "connected" | "disconnected" | "error"
}

const props = defineProps({
  log: { type: Array as PropType<LogEntryData[]>, default: () => [] },
  title: {
    type: String,
    default: "",
  },
})

const emit = defineEmits<{
  (e: "delete"): void
}>()

const t = useI18n()

const container = ref<HTMLElement | null>(null)
const logs = ref<HTMLElement | null>(null)

const autoScrollEnabled = ref(true)

const logListScroll = useScroll(logs)

// Disable autoscroll when scrolling to top
watch(logListScroll.isScrolling, (isScrolling) => {
  if (isScrolling && logListScroll.directions.top)
    autoScrollEnabled.value = false
})

const scrollTo = (position: "top" | "bottom") => {
  if (position === "top") {
    logs.value?.scroll({
      behavior: "smooth",
      top: 0,
    })
  } else if (position === "bottom") {
    logs.value?.scroll({
      behavior: "smooth",
      top: logs.value?.scrollHeight,
    })
  }
}

watch(
  () => props.log,
  useThrottleFn(() => {
    if (autoScrollEnabled.value) scrollTo("bottom")
  }, 200),
  { flush: "post" }
)

const toggleAutoscroll = () => {
  autoScrollEnabled.value = !autoScrollEnabled.value
}

const toggleAutoscrollColor = computed(() =>
  autoScrollEnabled.value ? "text-green-500" : "text-red-500"
)
</script>

<style></style>
