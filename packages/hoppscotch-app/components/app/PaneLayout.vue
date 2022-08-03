<template>
  <Splitpanes
    class="smart-splitter"
    :rtl="SIDEBAR_ON_LEFT && mdAndLarger"
    :class="{
      '!flex-row-reverse': SIDEBAR_ON_LEFT && mdAndLarger,
    }"
    :horizontal="!mdAndLarger"
    @resize="setVerticalPanelInfo"
  >
    <Pane
      :size="PANE_MAIN_SIZE.value"
      min-size="65"
      class="hide-scrollbar !overflow-auto flex flex-col"
    >
      <Splitpanes
        class="smart-splitter"
        :horizontal="COLUMN_LAYOUT"
        @resize="setHorizontalPanelInfo"
      >
        <Pane
          :size="PANE_MAIN_TOP_SIZE.value"
          min-size="50"
          class="hide-scrollbar !overflow-auto flex flex-col"
        >
          <slot name="primary" />
        </Pane>
        <Pane
          :size="PANE_MAIN_BOTTOM_SIZE.value"
          min-size="20"
          class="flex flex-col hide-scrollbar !overflow-auto"
        >
          <slot name="secondary" />
        </Pane>
      </Splitpanes>
    </Pane>
    <Pane
      v-if="SIDEBAR && hasSidebar"
      :size="PANE_SIDEBAR_SIZE.value"
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
import { computed, useSlots } from "@nuxtjs/composition-api"
import { ref } from "@vue/runtime-dom"
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
    default: "default",
  },
})

type PanelInfo = {
  max: number
  min: number
  size: number
}

const PANE_SIDEBAR_SIZE = ref()
const PANE_MAIN_SIZE = ref()
const PANE_MAIN_TOP_SIZE = ref()
const PANE_MAIN_BOTTOM_SIZE = ref()
const PANE_STORAGE_KEY = `${props.layoutId}-app-pane-layout`

function setVerticalPanelInfo(event: PanelInfo[]) {
  setLocalConfig(`${PANE_STORAGE_KEY}_vertical`, JSON.stringify(event))
}

function getVerticalPanelInfo() {
  PANE_SIDEBAR_SIZE.value = 25
  PANE_MAIN_SIZE.value = 75
  const panelDataFromStorage = getLocalConfig(`${PANE_STORAGE_KEY}_vertical`)
  if (panelDataFromStorage) {
    const panelData = JSON.parse(panelDataFromStorage)
    PANE_MAIN_SIZE.value = panelData[0].size
    PANE_SIDEBAR_SIZE.value = panelData[1].size
  }
}

function setHorizontalPanelInfo(event: PanelInfo[]) {
  setLocalConfig(`${PANE_STORAGE_KEY}_horizontal`, JSON.stringify(event))
}

function getHorizontallPanelInfo() {
  PANE_MAIN_TOP_SIZE.value = 45
  PANE_MAIN_BOTTOM_SIZE.value = 65

  const panelDataFromStorage = getLocalConfig(`${PANE_STORAGE_KEY}_horizontal`)
  if (panelDataFromStorage) {
    const panelData = JSON.parse(panelDataFromStorage)
    PANE_MAIN_TOP_SIZE.value = panelData[0].size
    PANE_MAIN_BOTTOM_SIZE.value = panelData[1].size
  }
}

getVerticalPanelInfo()
getHorizontallPanelInfo()

const hasSidebar = computed(() => !!slots.sidebar)
</script>
