<template>
  <Splitpanes
    :rtl="SIDEBAR_ON_LEFT && mdAndLarger"
    :class="{
      '!flex-row-reverse': SIDEBAR_ON_LEFT && mdAndLarger,
      'smart-splitter': SIDEBAR && hasSidebar,
      'no-splitter': !(SIDEBAR && hasSidebar),
      'drag-to-collapse': isDraggingToCollapse,
    }"
    :horizontal="!mdAndLarger"
    @resize="setPaneEvent($event, 'vertical')"
  >
    <Pane
      :size="SIDEBAR && hasSidebar ? PANE_MAIN_SIZE : 100"
      min-size="65"
      class="flex flex-col !overflow-auto"
    >
      <Splitpanes
        class="smart-splitter"
        :horizontal="COLUMN_LAYOUT || forceColumnLayout"
        @resize="setPaneEvent($event, 'horizontal')"
      >
        <Pane
          :size="PANE_MAIN_TOP_SIZE"
          class="flex flex-col !overflow-auto"
          :min-size="isEmbed ? 12 : 25"
        >
          <slot name="primary" />
        </Pane>
        <Pane
          v-if="hasSecondary"
          :size="PANE_MAIN_BOTTOM_SIZE"
          class="flex flex-col !overflow-auto"
          min-size="25"
        >
          <slot name="secondary" />
        </Pane>
      </Splitpanes>
    </Pane>
    <Pane
      :size="SIDEBAR && hasSidebar ? PANE_SIDEBAR_SIZE : 0"
      :min-size="25"
      class="flex flex-col !overflow-auto bg-primaryContrast"
    >
      <slot name="sidebar" />
    </Pane>
  </Splitpanes>
</template>

<script setup lang="ts">
import { Pane, Splitpanes } from "splitpanes"

import "splitpanes/dist/splitpanes.css"

import { useSetting } from "@composables/settings"
import { breakpointsTailwind, useBreakpoints } from "@vueuse/core"
import { useService } from "dioc/vue"
import { computed, onMounted, onUnmounted, ref, useSlots, watch } from "vue"
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

// State for drag-to-collapse visual feedback
const isDraggingToCollapse = ref(false)
const dragCollapseThreshold = 28 // Show visual feedback when approaching minimum
const collapseThreshold = 25.5 // Trigger collapse just at minimum constraint
let dragFeedbackTimeout: ReturnType<typeof setTimeout> | null = null
let collapseTimeout: ReturnType<typeof setTimeout> | null = null
let lastSidebarSize = 0 // Track size changes to detect stalling at minimum

if (!COLUMN_LAYOUT.value) {
  PANE_MAIN_TOP_SIZE.value = 50
  PANE_MAIN_BOTTOM_SIZE.value = 50
}

async function setPaneEvent(
  event: PaneEvent[],
  type: "vertical" | "horizontal"
) {
  if (!props.layoutId) return
  
  // Handle drag-to-collapse functionality for vertical resize (sidebar)
  // Only enable on larger screens where the sidebar can be dragged
  if (type === "vertical" && hasSidebar.value && SIDEBAR.value && mdAndLarger.value) {
    // The sidebar is always the second pane (index 1) in the splitpanes events array
    // regardless of visual positioning (RTL, flex-row-reverse)
    const sidebarPane = event[1]
    
    if (sidebarPane) {
      // Clear any existing timeout
      if (dragFeedbackTimeout) {
        clearTimeout(dragFeedbackTimeout)
      }
      
      // Update visual feedback state when user approaches minimum size
      const shouldShowFeedback = sidebarPane.size <= dragCollapseThreshold
      isDraggingToCollapse.value = shouldShowFeedback
      
      // Auto-collapse sidebar when user reaches minimum size
      // This covers both cases: hitting exact minimum OR being blocked by min-size constraint
      if (sidebarPane.size <= collapseThreshold) {
        // Clear any existing collapse timeout
        if (collapseTimeout) {
          clearTimeout(collapseTimeout)
        }
        
        // Add a small delay to make the transition feel more natural
        collapseTimeout = setTimeout(() => {
          SIDEBAR.value = false
          isDraggingToCollapse.value = false
          collapseTimeout = null
        }, 100)
        return // Don't save the resize event when collapsing
      } else {
        // Set timeout to clear feedback state if user stops dragging
        dragFeedbackTimeout = setTimeout(() => {
          isDraggingToCollapse.value = false
        }, 200)
      }
      
      // Update last size for next comparison
      lastSidebarSize = sidebarPane.size
    }
  }
  
  const storageKey = `${props.layoutId}-pane-config-${type}`
  await persistenceService.setLocalConfig(storageKey, JSON.stringify(event))
}

async function populatePaneEvent() {
  if (!props.layoutId) return

  const verticalPaneData = await getPaneData("vertical")
  if (verticalPaneData) {
    const [mainPane, sidebarPane] = verticalPaneData
    PANE_MAIN_SIZE.value = mainPane?.size
    PANE_SIDEBAR_SIZE.value = sidebarPane?.size
  }

  const horizontalPaneData = await getPaneData("horizontal")
  if (horizontalPaneData) {
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

// Watch for external SIDEBAR changes to clean up visual state
watch(SIDEBAR, (newValue) => {
  if (!newValue) {
    // Sidebar was collapsed externally, clean up drag state
    isDraggingToCollapse.value = false
    if (dragFeedbackTimeout) {
      clearTimeout(dragFeedbackTimeout)
      dragFeedbackTimeout = null
    }
    if (collapseTimeout) {
      clearTimeout(collapseTimeout)
      collapseTimeout = null
    }
  }
})

onMounted(async () => {
  await populatePaneEvent()
})

onUnmounted(() => {
  // Clean up any pending timeouts to prevent memory leaks
  if (dragFeedbackTimeout) {
    clearTimeout(dragFeedbackTimeout)
    dragFeedbackTimeout = null
  }
  if (collapseTimeout) {
    clearTimeout(collapseTimeout)
    collapseTimeout = null
  }
})
</script>

<style scoped>
/* Visual feedback for drag-to-collapse */
:deep(.drag-to-collapse .splitpanes__splitter::before) {
  @apply bg-red-500 opacity-75;
  animation: pulse 0.6s ease-in-out infinite alternate;
}

@keyframes pulse {
  from {
    opacity: 0.5;
  }
  to {
    opacity: 1;
  }
}
</style>
