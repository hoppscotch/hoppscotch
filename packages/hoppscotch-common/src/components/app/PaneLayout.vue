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
            class="group z-[1] flex cursor-pointer items-center bg-primary"
            :class="
              isStackedLayout
                ? 'sticky top-0 flex-row border-b border-dividerLight px-1 py-2'
                : 'sticky left-0 top-0 min-h-0 w-10 shrink-0 flex-col justify-center gap-1 self-stretch border-dividerLight px-1 py-2'
            "
            role="button"
            tabindex="0"
            :aria-expanded="!isResponseCollapsed"
            :aria-controls="`${props.layoutId ?? 'default'}-${props.tabId ?? 'default'}-response-pane-content`"
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
                class="pointer-events-none inline-flex h-6 w-6 shrink-0 items-center justify-center rounded opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100"
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
                class="font-semibold text-secondaryDark"
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
            v-show="!isResponseCollapsed"
            :id="`${props.layoutId ?? 'default'}-${props.tabId ?? 'default'}-response-pane-content`"
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

type PaneEvent = { max: number; min: number; size: number }
type ResponseCollapseMode = "auto" | "manual"
type PaneConfigStore = {
  vertical: Record<string, PaneEvent[]>
  horizontal: Record<string, PaneEvent[]>
}

const SIDEBAR_ON_LEFT = useSetting("SIDEBAR_ON_LEFT")
const COLUMN_LAYOUT = useSetting("COLUMN_LAYOUT")
const SIDEBAR = useSetting("SIDEBAR")

const breakpoints = useBreakpoints(breakpointsTailwind)
const mdAndLarger = breakpoints.greater("md")

const slots = useSlots()
const persistenceService = useService(PersistenceService)

const hasSidebar = computed(() => !!slots.sidebar)
const hasSecondary = computed(() => !!slots.secondary)

const props = defineProps({
  layoutId: { type: String, default: null },
  tabId: { type: String, default: null },
  isEmbed: { type: Boolean, default: false },
  forceColumnLayout: { type: Boolean, default: false },
})

const isStackedLayout = computed(
  () => COLUMN_LAYOUT.value || props.forceColumnLayout
)

const RESPONSE_COLLAPSED_SIZE = 5
const RESPONSE_EXPANDED_MIN_SIZE = 25

const PANE_MAIN_SIZE = ref(70)
const PANE_SIDEBAR_SIZE = ref(30)
const PANE_MAIN_TOP_SIZE = ref(isStackedLayout.value ? 35 : 50)
const PANE_MAIN_BOTTOM_SIZE = ref(isStackedLayout.value ? 65 : 50)
const lastExpandedBottomSize = ref(PANE_MAIN_BOTTOM_SIZE.value)
const responseCollapseMode = ref<ResponseCollapseMode>("manual")

const isResponseCollapsed = computed(
  () => PANE_MAIN_BOTTOM_SIZE.value <= RESPONSE_COLLAPSED_SIZE + 0.1
)

// The top pane min-size constrains how large the bottom pane can grow.
const maxBottomSize = computed(() => 100 - (props.isEmbed ? 12 : 25))

const defaultExpandedBottomSize = computed(() =>
  Math.min(RESPONSE_EXPANDED_MIN_SIZE, maxBottomSize.value)
)

// ─── Persistence helpers ───

function contextId(): string {
  return props.tabId ?? "default"
}

function collapseModeKey(): string | null {
  return props.layoutId ? `${props.layoutId}-response-collapse-mode` : null
}

function paneConfigKey(): string | null {
  return props.layoutId ? `${props.layoutId}-pane-config` : null
}

async function readJsonConfig<T>(key: string): Promise<T | null> {
  const raw = await persistenceService.getLocalConfig(key)
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === "object" ? (parsed as T) : null
  } catch {
    return null
  }
}

async function writeJsonConfig(key: string, value: unknown): Promise<void> {
  await persistenceService.setLocalConfig(key, JSON.stringify(value))
}

// ─── Collapse-mode persistence ───

async function loadResponseCollapseMode(): Promise<ResponseCollapseMode> {
  const key = collapseModeKey()
  if (!key) return "manual"

  const raw = await persistenceService.getLocalConfig(key)
  if (!raw) return "manual"

  // Backward-compat: older versions stored a bare string.
  if (raw === "auto" || raw === "manual") return raw

  const record = await readJsonConfig<Record<string, unknown>>(key)
  const mode = record?.[contextId()] ?? record?.["default"]
  return mode === "auto" || mode === "manual" ? mode : "manual"
}

async function persistResponseCollapseMode(
  mode: ResponseCollapseMode | null
): Promise<void> {
  const key = collapseModeKey()
  if (!key) return

  const id = contextId()
  const raw = await persistenceService.getLocalConfig(key)

  // Backward-compat: promote bare string to record form.
  let record: Record<string, ResponseCollapseMode> = {}
  if (raw === "auto" || raw === "manual") {
    record.default = raw
  } else if (raw) {
    record =
      (await readJsonConfig<Record<string, ResponseCollapseMode>>(key)) ?? {}
  }

  if (mode === null) {
    delete record[id]
  } else {
    record[id] = mode
  }

  if (Object.keys(record).length === 0) {
    await persistenceService.removeLocalConfig(key)
  } else {
    await writeJsonConfig(key, record)
  }
}

// ─── Pane-size persistence ───

async function getPaneData(
  type: "vertical" | "horizontal"
): Promise<PaneEvent[] | null> {
  const key = paneConfigKey()
  if (!key) return null
  const store = await readJsonConfig<Partial<PaneConfigStore>>(key)
  return store?.[type]?.[contextId()] ?? null
}

async function setPaneEvent(
  event: PaneEvent[],
  type: "vertical" | "horizontal"
): Promise<void> {
  const key = paneConfigKey()
  if (!key) return

  const existing = await readJsonConfig<Partial<PaneConfigStore>>(key)
  const store: PaneConfigStore = {
    vertical: existing?.vertical ?? {},
    horizontal: existing?.horizontal ?? {},
  }
  store[type][contextId()] = event
  await writeJsonConfig(key, store)
}

// ─── Pane-size sync ───

/**
 * Snaps the bottom pane: values at or below the collapsed threshold become the
 * sentinel; anything above is pushed up to the expanded minimum.
 */
function clampBottomSize(size: number): number {
  return size <= RESPONSE_COLLAPSED_SIZE + 0.1
    ? RESPONSE_COLLAPSED_SIZE
    : Math.max(size, RESPONSE_EXPANDED_MIN_SIZE)
}

/**
 * Applies a two-element Splitpanes event to the reactive size refs.
 * Pass `clamp = true` on drag-end and hydration; `false` during live drag.
 */
function syncHorizontalPaneSizes(event: PaneEvent[], clamp = false): void {
  if (event.length < 2) return
  const [topPane, bottomPane] = event
  if (bottomPane?.size == null) return

  const bottom = clamp ? clampBottomSize(bottomPane.size) : bottomPane.size
  PANE_MAIN_BOTTOM_SIZE.value = bottom
  PANE_MAIN_TOP_SIZE.value =
    clamp || topPane?.size == null ? Math.max(100 - bottom, 0) : topPane.size
}

async function persistCurrentHorizontalLayout(): Promise<void> {
  if (!props.layoutId || !hasSecondary.value) return
  await setPaneEvent(
    [
      { max: 100, min: 0, size: PANE_MAIN_TOP_SIZE.value },
      { max: 100, min: 0, size: PANE_MAIN_BOTTOM_SIZE.value },
    ],
    "horizontal"
  )
}

// ─── Event handlers ───

function onHorizontalPaneResize(event: PaneEvent[]): void {
  syncHorizontalPaneSizes(event, false)
  if (PANE_MAIN_BOTTOM_SIZE.value > RESPONSE_COLLAPSED_SIZE + 0.1) {
    lastExpandedBottomSize.value = PANE_MAIN_BOTTOM_SIZE.value
  }
}

async function onHorizontalPaneResized(event: PaneEvent[]): Promise<void> {
  syncHorizontalPaneSizes(event, true)

  if (isResponseCollapsed.value) {
    // Drag-to-collapse: expanding should reset to the default minimum, not the
    // pre-collapse size (which is near-zero and meaningless as a restore target).
    responseCollapseMode.value = "auto"
    lastExpandedBottomSize.value = defaultExpandedBottomSize.value
    await persistResponseCollapseMode("auto")
  } else {
    responseCollapseMode.value = "manual"
    await persistResponseCollapseMode(null)
  }

  await persistCurrentHorizontalLayout()
}

// ─── Lifecycle ───

async function populatePaneEvent(): Promise<void> {
  if (!props.layoutId) return

  const verticalData = await getPaneData("vertical")
  if (Array.isArray(verticalData) && verticalData.length >= 2) {
    const [main, sidebar] = verticalData
    if (main?.size != null) PANE_MAIN_SIZE.value = main.size
    if (sidebar?.size != null) PANE_SIDEBAR_SIZE.value = sidebar.size
  }

  const horizontalData = await getPaneData("horizontal")
  if (!Array.isArray(horizontalData) || horizontalData.length < 2) return

  syncHorizontalPaneSizes(horizontalData, true)

  responseCollapseMode.value = await loadResponseCollapseMode()

  // When switching tabs: if the last collapse was triggered by dragging to the
  // threshold, start expanded rather than staying collapsed.
  if (responseCollapseMode.value === "auto" && isResponseCollapsed.value) {
    const expanded = defaultExpandedBottomSize.value
    PANE_MAIN_BOTTOM_SIZE.value = expanded
    PANE_MAIN_TOP_SIZE.value = 100 - expanded
    lastExpandedBottomSize.value = expanded
    responseCollapseMode.value = "manual"
  } else if (PANE_MAIN_BOTTOM_SIZE.value > RESPONSE_COLLAPSED_SIZE + 0.1) {
    lastExpandedBottomSize.value = PANE_MAIN_BOTTOM_SIZE.value
  }
}

onMounted(populatePaneEvent)

// ─── Toggle ───
async function toggleResponsePane(): Promise<void> {
  if (isResponseCollapsed.value) {
    const expanded =
      responseCollapseMode.value === "auto"
        ? defaultExpandedBottomSize.value
        : Math.min(lastExpandedBottomSize.value, maxBottomSize.value)

    PANE_MAIN_BOTTOM_SIZE.value = expanded
    PANE_MAIN_TOP_SIZE.value = 100 - expanded
    lastExpandedBottomSize.value = expanded
    responseCollapseMode.value = "manual"
    await persistResponseCollapseMode(null)
  } else {
    lastExpandedBottomSize.value = PANE_MAIN_BOTTOM_SIZE.value
    PANE_MAIN_BOTTOM_SIZE.value = RESPONSE_COLLAPSED_SIZE
    PANE_MAIN_TOP_SIZE.value = Math.max(100 - RESPONSE_COLLAPSED_SIZE, 0)
    responseCollapseMode.value = "manual"
    await persistResponseCollapseMode("manual")
  }

  await persistCurrentHorizontalLayout()
}
</script>
