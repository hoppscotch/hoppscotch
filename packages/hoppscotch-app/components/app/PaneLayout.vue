<template>
  <Splitpanes
    class="smart-splitter"
    :rtl="SIDEBAR_ON_LEFT && mdAndLarger"
    :class="{
      '!flex-row-reverse': SIDEBAR_ON_LEFT && mdAndLarger,
    }"
    :horizontal="!mdAndLarger"
    @resize="setVerticalPaneEvent"
  >
    <Pane
      :size="PANE_MAIN_SIZE"
      min-size="65"
      class="hide-scrollbar !overflow-auto flex flex-col"
    >
      <Splitpanes
        class="smart-splitter"
        :horizontal="COLUMN_LAYOUT"
        @resize="setHorizontalPaneEvent"
      >
        <Pane
          :size="PANE_MAIN_TOP_SIZE"
          min-size="50"
          class="hide-scrollbar !overflow-auto flex flex-col"
        >
          <slot name="primary" />
        </Pane>
        <Pane
          :size="PANE_MAIN_BOTTOM_SIZE"
          min-size="20"
          class="flex flex-col hide-scrollbar !overflow-auto"
        >
          <slot name="secondary" />
        </Pane>
      </Splitpanes>
    </Pane>
    <Pane
      v-if="SIDEBAR && hasSidebar"
      :size="PANE_SIDEBAR_SIZE"
      min-size="20"
      class="hide-scrollbar !overflow-auto flex flex-col"
    >
      <slot name="sidebar" />
    </Pane>
  </Splitpanes>
</template>

<script setup lang="ts">
import { Splitpanes, Pane } from "splitpanes"
import "splitpanes/dist/splitpanes.css"
import { breakpointsTailwind, useBreakpoints } from "@vueuse/core"
import { computed, useSlots, ref } from "@nuxtjs/composition-api"
import { useSetting } from "~/newstore/settings"
import { setLocalConfig, getLocalConfig } from "~/newstore/localpersistence"

const SIDEBAR_ON_LEFT = useSetting("SIDEBAR_ON_LEFT")

const breakpoints = useBreakpoints(breakpointsTailwind)
const mdAndLarger = breakpoints.greater("md")

const COLUMN_LAYOUT = useSetting("COLUMN_LAYOUT")

const SIDEBAR = useSetting("SIDEBAR")

const slots = useSlots()

const props = defineProps({
  layoutId: {
    type: String,
    default: null,
  },
})

type PaneEvent = {
  max: number
  min: number
  size: number
}

const PANE_SIDEBAR_SIZE = ref(25)
const PANE_MAIN_SIZE = ref(75)
const PANE_MAIN_TOP_SIZE = ref(45)
const PANE_MAIN_BOTTOM_SIZE = ref(65)
const PANE_STORAGE_KEY = `${props.layoutId}-app-pane-layout`

if (!COLUMN_LAYOUT) {
  PANE_MAIN_TOP_SIZE.value = 50
  PANE_MAIN_BOTTOM_SIZE.value = 50
}

function setVerticalPaneEvent(event: PaneEvent[]) {
  if (!props.layoutId) return

  setLocalConfig(`${PANE_STORAGE_KEY}_vertical`, JSON.stringify(event))
}

function getVerticalPaneEvent() {
  const paneDataFromStorage = getLocalConfig(`${PANE_STORAGE_KEY}_vertical`)
  if (paneDataFromStorage) {
    const paneData: PaneEvent[] = JSON.parse(paneDataFromStorage)
    PANE_MAIN_SIZE.value = paneData[0].size
    PANE_SIDEBAR_SIZE.value = paneData[1].size
  }
}

function setHorizontalPaneEvent(event: PaneEvent[]) {
  if (!props.layoutId) return

  setLocalConfig(`${PANE_STORAGE_KEY}_horizontal`, JSON.stringify(event))
}

function getHorizontallPaneEvent() {
  const paneDataFromStorage = getLocalConfig(`${PANE_STORAGE_KEY}_horizontal`)
  if (paneDataFromStorage) {
    const paneData: PaneEvent[] = JSON.parse(paneDataFromStorage)
    PANE_MAIN_TOP_SIZE.value = paneData[0].size
    PANE_MAIN_BOTTOM_SIZE.value = paneData[1].size
  }
}

getVerticalPaneEvent()
getHorizontallPaneEvent()

const hasSidebar = computed(() => !!slots.sidebar)
</script>
