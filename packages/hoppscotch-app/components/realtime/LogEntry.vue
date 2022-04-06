<template>
  <div
    v-if="entry"
    :style="{ color: entryColor }"
    class="font-uniform realtime-log"
    @mouseover="invertHover()"
    @mouseout="invertHover()"
  >
    <div class="border-y divide-y divide-dividerLight border-dividerLight">
      <div class="flex divide-x divide-dividerLight">
        <div class="inline-flex items-center">
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :svg="`${source(entry.source)}`"
            @click.native="copyQuery(entry.payload)"
          />
        </div>
        <div class="hidden sm:inline-flex items-center px-1.1 w-18">
          <span
            ref="timestampEl"
            class="ts-font text-secondaryLight hover:text-secondary"
          >
            {{
              timestampHovered
                ? relativeTime
                : new Date(entry.ts).toLocaleTimeString()
            }}
          </span>
        </div>

        <div
          :class="expandPayload"
          class="flex-1 inline-flex items-center px-1.5"
        >
          <span @click="invertPayload()">{{ entry.payload }}</span>
        </div>
        <div :class="expandCopy" class="ml-1 items-center">
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('action.copy')"
            :svg="`${copyQueryIcon}`"
            @click.native="copyQuery(entry.payload)"
          />
        </div>
        <div class="inline-flex items-center">
          <ButtonSecondary
            svg="chevron-down"
            class="transform"
            :class="{ 'rotate-180': !payload }"
            @click.native="invertPayload()"
          />
        </div>
      </div>
    </div>
  </div>
  <div v-else>{{ t("response.waiting_for_connection") }}</div>
</template>

<script setup lang="ts">
import { ref, computed } from "@nuxtjs/composition-api"
import { useElementHover, useTimeAgo } from "@vueuse/core"
import { LogEntryData } from "./Log.vue"
import { useI18n } from "~/helpers/utils/composables"
import { copyToClipboard } from "~/helpers/utils/clipboard"

const t = useI18n()

const payload = ref(true)
const hover = ref(false)

const relativeTime = useTimeAgo(
  computed(() => {
    return props.entry.ts
  })
)

const timestampEl = ref()
const timestampHovered = useElementHover(timestampEl)

const props = defineProps<{ entry: LogEntryData }>()

const entryColor = computed(() => {
  switch (props.entry.event) {
    case "connected":
      return "#10b981"
    case "connecting":
      return "#10b981"
    case "error":
      return "#ff5555"
    case "disconnected":
      return "#ff5555"
  }
})

const expandPayload = computed(() => {
  if (payload.value) return "truncate"
  return "max-w-68 sm:max-w-none overflow-auto"
})

const expandCopy = computed(() => {
  if (hover.value) return "inline-flex"
  return "hidden"
})

const copyQueryIcon = ref("copy")
const copyQuery = (entry: string) => {
  copyToClipboard(entry)
  copyQueryIcon.value = "check"
  setTimeout(() => (copyQueryIcon.value = "copy"), 1000)
}

const invertPayload = () => {
  payload.value = !payload.value
}

const invertHover = () => {
  hover.value = !hover.value
}

const sourceIcons = {
  // Source used for info messages.
  info: "info-realtime",
  // Source used for client to server messages.
  client: "arrow-up-right",
  // Source used for server to client messages.
  server: "arrow-down-left",
  // Source used for disconnected messages.
  disconnected: "info-disconnect",
}

const source = (source: keyof typeof sourceIcons) => {
  return sourceIcons[source]
}
</script>

<style scoped lang="scss">
.realtime-log {
  @apply bg-transparent;
  @apply text-secondary;
  @apply overflow-auto;

  &,
  span {
    @apply select-text;
  }

  span {
    @apply block;
    @apply break-words break-all;
  }

  .ts-font {
    font-size: 0.62rem;
  }
}
</style>
