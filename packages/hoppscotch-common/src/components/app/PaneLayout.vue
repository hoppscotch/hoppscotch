<template>
  <Splitpanes
    :rtl="SIDEBAR_ON_LEFT && mdAndLarger"
    :class="{
      '!flex-row-reverse': SIDEBAR_ON_LEFT && mdAndLarger,
      'smart-splitter': SIDEBAR && hasSidebar,
      'no-splitter': !(SIDEBAR && hasSidebar),
    }"
    :horizontal="!mdAndLarger"
    @resize="setPaneEvent($event, 'vertical')"
  >
    <Pane
      :size="SIDEBAR && hasSidebar ? PANE_MAIN_SIZE : 100"
      min-size="65"
      class="flex flex-col overflow-hidden"
    >
      <Splitpanes
        class="smart-splitter"
        :horizontal="COLUMN_LAYOUT || forceColumnLayout"
        @resize="setPaneEvent($event, 'horizontal')"
      >
        <Pane
          :size="PANE_MAIN_TOP_SIZE"
          class="flex flex-col overflow-auto"
          :min-size="isEmbed ? 12 : 25"
        >
          <slot name="primary" />
        </Pane>
        <Pane
          v-if="hasSecondary"
          :size="PANE_MAIN_BOTTOM_SIZE"
          class="flex flex-col overflow-auto"
          min-size="25"
        >
          <slot name="secondary" />
        </Pane>
      </Splitpanes>
    </Pane>
    <Pane
      :size="SIDEBAR && hasSidebar ? PANE_SIDEBAR_SIZE : (hasSidebar ? 4 : 0)"
      :min-size="SIDEBAR && hasSidebar ? 25 : (hasSidebar ? 4 : 0)"
      class="flex flex-col !overflow-auto bg-primaryContrast"
    >
      <slot name="sidebar" />
      <!-- Collapsed sidebar indicator - shows when sidebar is hidden -->
      <div
        v-if="!SIDEBAR && hasSidebar"
        class="flex flex-col items-center justify-center w-full h-full bg-primary border-l border-dividerLight"
      >
        <div class="flex flex-col gap-2 py-2 px-1 text-xs text-secondaryLight">
          <button
            v-tippy="{ theme: 'tooltip', placement: 'right' }"
            title="Expand sidebar"
            class="p-1 rounded hover:bg-primaryLight transition-colors"
            @click="SIDEBAR = true"
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
        </div>
      </div>
    </Pane>
  </Splitpanes>
</template>

<script setup lang="ts">
import { Pane, Splitpanes } from "splitpanes"

import "splitpanes/dist/splitpanes.css"

import { useSetting } from "@composables/settings"
import { breakpointsTailwind, useBreakpoints } from "@vueuse/core"
import { useService } from "dioc/vue"
import { computed, onMounted, ref, useSlots } from "vue"
import { PersistenceService } from "~/services/persistence"

const SIDEBAR_ON_LEFT = useSetting("SIDEBAR_ON_LEFT")

const breakpoints = useBreakpoints(breakpointsTailwind)
const mdAndLarger = breakpoints.greater("md")

const COLUMN_LAYOUT = useSetting("COLUMN_LAYOUT")

const SIDEBAR = useSetting("SIDEBAR")

const slots = useSlots()

const persistenceService = useService(PersistenceService)

const hasSidebar = computed(() => !!slots.sidebar)
const hasSecondary = computed(() => !!slots.secondary)

const props = defineProps({
  layoutId: {
    type: String,
    default: null,
  },
  isEmbed: {
    type: Boolean,
    default: false,
  },
  forceColumnLayout: {
    type: Boolean,
    default: false,
  },
})

type PaneEvent = {
  max: number
  min: number
  size: number
}

const PANE_MAIN_SIZE = ref(70)
const PANE_SIDEBAR_SIZE = ref(30)
const PANE_MAIN_TOP_SIZE = ref(35)
const PANE_MAIN_BOTTOM_SIZE = ref(65)

if (!COLUMN_LAYOUT.value) {
  PANE_MAIN_TOP_SIZE.value = 50
  PANE_MAIN_BOTTOM_SIZE.value = 50
}

async function setPaneEvent(
  event: PaneEvent[],
  type: "vertical" | "horizontal"
) {
  if (!props.layoutId) return
  const storageKey = `${props.layoutId}-pane-config-${type}`
  await persistenceService.setLocalConfig(storageKey, JSON.stringify(event))
}

async function populatePaneEvent() {
  if (!props.layoutId) return

  const verticalPaneData = await getPaneData("vertical")
  if (verticalPaneData && Array.isArray(verticalPaneData)) {
    const [mainPane, sidebarPane] = verticalPaneData
    PANE_MAIN_SIZE.value = mainPane?.size
    PANE_SIDEBAR_SIZE.value = sidebarPane?.size
  }

  const horizontalPaneData = await getPaneData("horizontal")
  if (horizontalPaneData && Array.isArray(horizontalPaneData)) {
    const [mainTopPane, mainBottomPane] = horizontalPaneData
    PANE_MAIN_TOP_SIZE.value = mainTopPane?.size
    PANE_MAIN_BOTTOM_SIZE.value = mainBottomPane?.size
  }
}

async function getPaneData(
  type: "vertical" | "horizontal"
): Promise<PaneEvent[] | null> {
  const storageKey = `${props.layoutId}-pane-config-${type}`
  const paneEvent = await persistenceService.getLocalConfig(storageKey)
  if (!paneEvent) return null
  return JSON.parse(paneEvent)
}

onMounted(async () => {
  await populatePaneEvent()
})
</script>
