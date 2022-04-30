<template>
  <div ref="container" class="flex flex-col h-full">
    <div
      class="sticky top-0 z-10 flex-none flex items-center justify-between pl-4 border-b bg-primary border-dividerLight"
    >
      <label for="log" class="py-2 font-semibold text-secondaryLight">
        {{ title }}
      </label>
      <div>
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.delete')"
          svg="trash"
          @click.native="$emit('delete')"
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

    <div ref="logs" class="flex-auto overflow-y-auto">
      <span ref="logListTop"></span>
      <RealtimeLogEntry
        v-for="(entry, index) in log"
        :key="`entry-${index}`"
        :entry="entry"
      />
      <span ref="logListBottom"></span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, PropType, computed, watch } from "@nuxtjs/composition-api"
import { useIntervalFn } from "@vueuse/core"
import { useI18n } from "~/helpers/utils/composables"

export type LogEntryData = {
  ts: number
  source: "info" | "client" | "server" | "disconnected"
  payload: string
  event: "connecting" | "connected" | "disconnected" | "error"
}

defineProps({
  log: { type: Array as PropType<LogEntryData[]>, default: () => [] },
  title: {
    type: String,
    default: "",
  },
})

const t = useI18n()

const logListBottom = ref<HTMLElement | null>(null)
const container = ref<HTMLElement | null>(null)
const logs = ref<HTMLElement | null>(null)
const logListTop = ref<HTMLElement | null>(null)

const scrollTo = (position: "top" | "bottom") => {
  if (position === "top") {
    logListTop.value?.scrollIntoView({ behavior: "smooth", block: "start" })
  } else if (position === "bottom") {
    logListBottom.value?.scrollIntoView({ behavior: "smooth", block: "end" })
  }
}

const autoScrollEnabled = ref(true)
const autoscrollTimer = useIntervalFn(() => {
  scrollTo("bottom")
}, 1000)

watch(autoScrollEnabled, () => {
  if (autoScrollEnabled.value) autoscrollTimer.resume()
  else autoscrollTimer.pause()
})

const toggleAutoscroll = () => {
  autoScrollEnabled.value = !autoScrollEnabled.value
}

const toggleAutoscrollColor = computed(() =>
  autoScrollEnabled.value ? "text-green-500" : "text-red-500"
)
</script>

<style></style>
