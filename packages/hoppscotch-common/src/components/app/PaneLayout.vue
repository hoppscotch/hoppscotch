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
        @resize="onHorizontalPaneResize"
        @resized="onHorizontalPaneResized"
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
          class="flex min-h-0 flex-1 overflow-hidden"
          :class="isStackedLayout ? 'flex-col' : 'flex-row'"
          :min-size="RESPONSE_COLLAPSED_SIZE"
        >
          <div
            class="group z-[1] flex cursor-pointer items-center border-0 border-dividerLight bg-primary"
            :class="
              isStackedLayout
                ? 'sticky top-0 flex-row border-0 border-dividerLight px-1 py-2'
                : 'sticky left-0 top-0 min-h-0 w-10 shrink-0 flex-col justify-center gap-1 self-stretch border-0 border-dividerLight px-1 py-2'
            "
            role="button"
            tabindex="0"
            :title="
              isResponseCollapsed
                ? t('response.expand_response_pane')
                : t('response.collapse_response_pane')
            "
            @click="toggleResponsePane"
            @keydown.enter.prevent="toggleResponsePane"
            @keydown.space.prevent="toggleResponsePane"
          >
            <div
              class="flex cursor-pointer"
              :class="
                isStackedLayout
                  ? 'flex-1 flex-row items-center self-stretch'
                  : 'flex-col items-center justify-center gap-1 self-stretch'
              "
            >
              <span
                class="pointer-events-none inline-flex h-6 w-6 shrink-0 items-center justify-center rounded opacity-0 transition group-hover:opacity-100"
                aria-hidden="true"
              >
                <IconChevronsDown
                  v-if="isStackedLayout && !isResponseCollapsed"
                  class="h-3.5 w-3.5"
                />
                <IconChevronsUp
                  v-else-if="isStackedLayout && isResponseCollapsed"
                  class="h-3.5 w-3.5"
                />
                <IconChevronsRight
                  v-else-if="!isStackedLayout && !isResponseCollapsed"
                  class="h-3.5 w-3.5"
                />
                <IconChevronsLeft v-else class="h-3.5 w-3.5" />
              </span>
              <div
                class="font-semibold font-size-lg font-weight-600 text-color"
                :class="
                  isStackedLayout
                    ? 'truncate text-center'
                    : 'rotate-180 text-center [text-orientation:mixed] [writing-mode:vertical-rl]'
                "
              >
                {{ t("response.response_pane") }}
              </div>
            </div>
          </div>
          <div
            v-if="!isResponseCollapsed"
            class="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto"
          >
            <slot name="secondary" />
          </div>
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
import { computed, onMounted, ref, useSlots } from "vue"
import IconChevronsDown from "~icons/lucide/chevrons-down"
import IconChevronsLeft from "~icons/lucide/chevrons-left"
import IconChevronsRight from "~icons/lucide/chevrons-right"
import IconChevronsUp from "~icons/lucide/chevrons-up"
import { useI18n } from "~/composables/i18n"
import { PersistenceService } from "~/services/persistence"

const t = useI18n()

type PaneEvent = {
  max: number
  min: number
  size: number
}

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

/** Stacked top/bottom panes (Splitpanes horizontal); false = side-by-side */
const isStackedLayout = computed(
  () => COLUMN_LAYOUT.value || props.forceColumnLayout
)

const PANE_MAIN_SIZE = ref(70)
const PANE_SIDEBAR_SIZE = ref(30)
const PANE_MAIN_TOP_SIZE = ref(35)
const PANE_MAIN_BOTTOM_SIZE = ref(65)
const RESPONSE_COLLAPSED_SIZE = 5
const RESPONSE_EXPANDED_MIN_SIZE = 25
const lastExpandedBottomSize = ref(PANE_MAIN_BOTTOM_SIZE.value)

if (!COLUMN_LAYOUT.value) {
  PANE_MAIN_TOP_SIZE.value = 50
  PANE_MAIN_BOTTOM_SIZE.value = 50
}

async function getPaneData(
  type: "vertical" | "horizontal"
): Promise<PaneEvent[] | null> {
  const storageKey = `${props.layoutId}-pane-config-${type}`
  const paneEvent = await persistenceService.getLocalConfig(storageKey)
  if (!paneEvent) return null
  return JSON.parse(paneEvent)
}

async function setPaneEvent(
  event: PaneEvent[],
  type: "vertical" | "horizontal"
) {
  if (!props.layoutId) return
  const storageKey = `${props.layoutId}-pane-config-${type}`
  await persistenceService.setLocalConfig(storageKey, JSON.stringify(event))
}

function syncHorizontalPaneSizesFromEvent(event: PaneEvent[]) {
  if (event.length < 2) return
  const [mainTopPane, mainBottomPane] = event
  if (mainTopPane?.size !== null) PANE_MAIN_TOP_SIZE.value = mainTopPane.size
  if (mainBottomPane?.size !== null)
    PANE_MAIN_BOTTOM_SIZE.value = mainBottomPane.size
}

async function onHorizontalPaneResize(event: PaneEvent[]) {
  syncHorizontalPaneSizesFromEvent(event)
  await setPaneEvent(event, "horizontal")
}

function getExpandedBottomSize(size: number) {
  return Math.max(size, RESPONSE_EXPANDED_MIN_SIZE)
}

async function onHorizontalPaneResized(event: PaneEvent[]) {
  syncHorizontalPaneSizesFromEvent(event)
  const mainBottomPane = event[1]
  if (mainBottomPane && mainBottomPane.size > RESPONSE_COLLAPSED_SIZE + 0.1) {
    lastExpandedBottomSize.value = getExpandedBottomSize(mainBottomPane.size)
  }
  await setPaneEvent(event, "horizontal")
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

onMounted(async () => {
  await populatePaneEvent()
})

const isResponseCollapsed = computed(
  () => PANE_MAIN_BOTTOM_SIZE.value <= RESPONSE_COLLAPSED_SIZE + 0.1
)

async function persistHorizontalLayout() {
  if (!props.layoutId || !hasSecondary.value) return
  const storageKey = `${props.layoutId}-pane-config-horizontal`
  const paneEvent = [
    { max: 100, min: 0, size: PANE_MAIN_TOP_SIZE.value },
    { max: 100, min: 0, size: PANE_MAIN_BOTTOM_SIZE.value },
  ]
  await persistenceService.setLocalConfig(storageKey, JSON.stringify(paneEvent))
}

async function toggleResponsePane() {
  if (isResponseCollapsed.value) {
    const expandedBottom = getExpandedBottomSize(lastExpandedBottomSize.value)
    PANE_MAIN_BOTTOM_SIZE.value = expandedBottom
    PANE_MAIN_TOP_SIZE.value = Math.max(100 - expandedBottom, 0)
  } else {
    lastExpandedBottomSize.value = getExpandedBottomSize(
      PANE_MAIN_BOTTOM_SIZE.value
    )
    PANE_MAIN_BOTTOM_SIZE.value = RESPONSE_COLLAPSED_SIZE
    PANE_MAIN_TOP_SIZE.value = Math.max(100 - RESPONSE_COLLAPSED_SIZE, 0)
  }

  await persistHorizontalLayout()
}
</script>
