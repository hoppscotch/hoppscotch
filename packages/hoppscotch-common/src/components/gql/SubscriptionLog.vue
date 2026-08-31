<template>
  <div ref="container" class="flex flex-1 flex-col">
    <div
      class="sticky top-0 z-10 flex flex-none items-center justify-between border-b border-dividerLight bg-primary pl-4"
    >
      <label for="log" class="py-2 font-semibold text-secondaryLight">
        {{ t("graphql.subscription_log") }}
      </label>
      <div>
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.delete')"
          :icon="IconTrash"
          @click="emit('delete')"
        />
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.scroll_to_top')"
          :icon="IconArrowUp"
          @click="scrollTo('top')"
        />
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.scroll_to_bottom')"
          :icon="IconArrowDown"
          @click="scrollTo('bottom')"
        />
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.autoscroll')"
          :icon="IconChevronsDown"
          :class="toggleAutoscrollColor"
          @click="toggleAutoscroll()"
        />
      </div>
    </div>
    <div
      v-if="log.length !== 0"
      ref="logs"
      class="flex-1 min-h-0 overflow-y-auto border-b border-dividerLight"
    >
      <div
        class="flex h-auto h-full flex-col divide-y divide-dividerLight border-r border-dividerLight"
      >
        <RealtimeLogEntry
          v-for="(entry, index) in log"
          :key="
            entry.type === 'response'
              ? `entry-${entry.time}-${index}`
              : `error-${index}`
          "
          :entry="
            entry.type === 'response'
              ? { ts: entry.time, source: 'info', payload: entry.data }
              : {
                  ts: undefined,
                  source: 'disconnected',
                  event: 'error',
                  payload: entry.error.message,
                }
          "
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, PropType, computed, watch } from "vue"
import IconTrash from "~icons/lucide/trash"
import IconArrowUp from "~icons/lucide/arrow-up"
import IconArrowDown from "~icons/lucide/arrow-down"
import IconChevronsDown from "~icons/lucide/chevron-down"
import { useThrottleFn, useScroll } from "@vueuse/core"
import { useI18n } from "@composables/i18n"
import { GQLResponseEvent } from "~/services/gql-tab-connection.service"

const props = defineProps({
  log: { type: Array as PropType<GQLResponseEvent[]>, default: () => [] },
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
