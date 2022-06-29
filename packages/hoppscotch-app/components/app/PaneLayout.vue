<template>
  <Splitpanes
    class="smart-splitter"
    :rtl="SIDEBAR_ON_LEFT && mdAndLarger"
    :class="{
      '!flex-row-reverse': SIDEBAR_ON_LEFT && mdAndLarger,
    }"
    :horizontal="!mdAndLarger"
  >
    <Pane
      size="75"
      min-size="65"
      class="hide-scrollbar !overflow-auto flex flex-col"
    >
      <Splitpanes class="smart-splitter" :horizontal="COLUMN_LAYOUT">
        <Pane
          :size="COLUMN_LAYOUT ? 45 : 50"
          class="hide-scrollbar !overflow-auto flex flex-col"
        >
          <slot name="primary" />
        </Pane>
        <Pane
          :size="COLUMN_LAYOUT ? 65 : 50"
          class="flex flex-col hide-scrollbar !overflow-auto"
        >
          <slot name="secondary" />
        </Pane>
      </Splitpanes>
    </Pane>
    <Pane
      v-if="SIDEBAR && hasSidebar"
      size="25"
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
import { useSetting } from "~/newstore/settings"

const SIDEBAR_ON_LEFT = useSetting("SIDEBAR_ON_LEFT")

const breakpoints = useBreakpoints(breakpointsTailwind)
const mdAndLarger = breakpoints.greater("md")

const COLUMN_LAYOUT = useSetting("COLUMN_LAYOUT")

const SIDEBAR = useSetting("SIDEBAR")

const slots = useSlots()

const hasSidebar = computed(() => !!slots.sidebar)
</script>
