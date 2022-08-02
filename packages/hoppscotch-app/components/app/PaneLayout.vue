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
      :size="panelVerticalInfo[0].size"
      :min-size="panelVerticalInfo[0].min"
      class="hide-scrollbar !overflow-auto flex flex-col"
    >
      <Splitpanes
        class="smart-splitter"
        :horizontal="COLUMN_LAYOUT"
        @resize="setHorizontalPanelInfo"
      >
        <Pane
          :size="COLUMN_LAYOUT ? panelHorizontalInfo[0].size : 50"
          class="hide-scrollbar !overflow-auto flex flex-col"
        >
          <slot name="primary" />
        </Pane>
        <Pane
          :size="COLUMN_LAYOUT ? panelHorizontalInfo[1].size : 50"
          class="flex flex-col hide-scrollbar !overflow-auto"
        >
          <slot name="secondary" />
        </Pane>
      </Splitpanes>
    </Pane>
    <Pane
      v-if="SIDEBAR && hasSidebar"
      :size="panelVerticalInfo[1].size"
      :min-size="panelVerticalInfo[1].min"
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
import { useSetting } from "~/newstore/settings"

const SIDEBAR_ON_LEFT = useSetting("SIDEBAR_ON_LEFT")

const breakpoints = useBreakpoints(breakpointsTailwind)
const mdAndLarger = breakpoints.greater("md")

const COLUMN_LAYOUT = useSetting("COLUMN_LAYOUT")

const SIDEBAR = useSetting("SIDEBAR")

const slots = useSlots()

let panelVerticalInfo: any = [
  {
    max: 100,
    min: 0,
    size: 75,
  },
  {
    max: 100,
    min: 0,
    size: 65,
  },
]

let panelHorizontalInfo: any = [
  {
    max: 100,
    min: 0,
    size: 75,
  },
  {
    max: 100,
    min: 0,
    size: 65,
  },
]

function setVerticalPanelInfo(event: any) {
  // eslint-disable-next-line no-restricted-globals
  localStorage.setItem("vertical_panel_info", JSON.stringify(event))
}

function getVerticalPanelInfo() {
  // eslint-disable-next-line no-restricted-globals
  let panelDataFromStorage = localStorage.getItem("vertical_panel_info")
  if (panelDataFromStorage) {
    panelDataFromStorage = JSON.parse(panelDataFromStorage)
  }
  if (!panelDataFromStorage) {
    setVerticalPanelInfo(panelVerticalInfo)
    getVerticalPanelInfo()
  }
  panelVerticalInfo = panelDataFromStorage
}

function setHorizontalPanelInfo(event: any) {
  // eslint-disable-next-line no-restricted-globals
  localStorage.setItem("horizontal_panel_info", JSON.stringify(event))
}

function getHorizontallPanelInfo() {
  // eslint-disable-next-line no-restricted-globals
  let panelDataFromStorage = localStorage.getItem("horizontal_panel_info")

  if (panelDataFromStorage) {
    panelDataFromStorage = JSON.parse(panelDataFromStorage)
  }

  if (!panelDataFromStorage) {
    setHorizontalPanelInfo(panelHorizontalInfo)
    getHorizontallPanelInfo()
  }

  panelHorizontalInfo = panelDataFromStorage
}

getVerticalPanelInfo()
getHorizontallPanelInfo()

const hasSidebar = computed(() => !!slots.sidebar)
</script>
