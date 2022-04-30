<template>
  <div ref="container">
    <div
      class="sticky top-0 z-10 flex items-center justify-between pl-4 border-b bg-primary border-dividerLight"
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
          :class="changeColor"
          @click.native="toggleAutoscroll()"
        />
      </div>
    </div>

    <div ref="logs">
      <span ref="logListTop"></span>
      <LogEntry
        v-for="(entry, index) in props.log"
        :key="`entry-${index}`"
        :ref="`entry-${index}`"
        :entry="entry"
      />
      <span ref="logListBottom"></span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, PropType, computed, watch } from "@nuxtjs/composition-api"
import { useIntervalFn, useScroll } from "@vueuse/core"
import { watchEffect } from "@vue/runtime-dom"
import LogEntry from "./LogEntry.vue"
import { useI18n } from "~/helpers/utils/composables"

export type LogEntryData = {
  ts: number
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

const t = useI18n()
const logListBottom = ref<any | null>(null)
const container = ref<any | null>(null)
const logs = ref<any | null>(null)
const logListTop = ref<any | null>(null)

const autoScrollEnabled = ref(true)

const scroll = useScroll(logs)

watchEffect(() => {
  console.log(scroll.y.value)
  console.log(scroll.isScrolling.value)
})

const scrollTo = (position: "top" | "bottom") => {
  if (logListTop.value && position === "top") {
    logListTop.value.scrollIntoView({ behavior: "smooth", block: "start" })
  } else if (logListBottom.value && position === "bottom") {
    logListBottom.value.scrollIntoView({ behavior: "smooth", block: "end" })
  }
}

const autoscroll = useIntervalFn(() => {
  logListBottom.value?.scrollIntoView({ behavior: "smooth", block: "end" })
}, 1000)

watch(autoScrollEnabled, () => {
  if (autoScrollEnabled.value) {
    autoscroll.resume()
  } else {
    autoscroll.pause()
  }
})

const toggleAutoscroll = () => {
  autoScrollEnabled.value = !autoScrollEnabled.value
}

// Just to identify the value of the autoscroll button. Will be removed in the future
const changeColor = computed(() => {
  if (autoScrollEnabled.value) {
    return "bg-green-500"
  } else {
    return "bg-red-500"
  }
})
</script>

<style></style>
