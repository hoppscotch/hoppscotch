<template>
  <div class="flex flex-col flex-1 h-auto overflow-y-hidden flex-nowrap">
    <div
      class="relative sticky top-0 z-10 flex-shrink-0 overflow-x-auto divide-x divide-dividerLight bg-primaryLight tabs group-tabs"
    >
      <div
        class="flex flex-1 flex-shrink-0 w-0 overflow-x-auto"
        ref="scrollContainer"
      >
        <div
          class="flex justify-between divide-x divide-dividerLight"
          @wheel.prevent="scroll"
        >
          <div class="flex">
            <draggable
              v-bind="dragOptions"
              :list="tabEntries"
              :style="tabStyles"
              :item-key="'window-'"
              class="flex flex-shrink-0 overflow-x-auto transition divide-x divide-dividerLight"
              @sort="sortTabs"
            >
              <template #item="{ element: [tabID, tabMeta] }">
                <button
                  :key="`removable-tab-${tabID}`"
                  :id="`removable-tab-${tabID}`"
                  class="px-2 tab group"
                  :class="[{ active: modelValue === tabID }]"
                  :aria-label="tabMeta.label || ''"
                  role="button"
                  @keyup.enter="selectTab(tabID)"
                  @click="selectTab(tabID)"
                >
                  <span
                    v-if="tabMeta.icon"
                    class="flex items-center justify-center cursor-pointer"
                  >
                    <component :is="tabMeta.icon" class="w-4 h-4 svg-icons" />
                  </span>

                  <div
                    v-if="!tabMeta.tabhead"
                    class="w-full px-2 text-left truncate"
                  >
                    <span class="truncate">
                      {{ tabMeta.label }}
                    </span>
                  </div>

                  <div v-else class="w-full text-left truncate">
                    <component :is="tabMeta.tabhead" />
                  </div>

                  <div
                    v-if="tabMeta.suffix"
                    class="flex items-center justify-center"
                  >
                    <component :is="tabMeta.suffix" />
                  </div>

                  <HoppButtonSecondary
                    v-if="tabMeta.isRemovable"
                    v-tippy="{ theme: 'tooltip', delay: [500, 20] }"
                    :icon="IconX"
                    :title="closeText ?? t?.('action.close') ?? 'Close'"
                    :class="[
                      { active: modelValue === tabID },
                      {
                        flex: tabMeta.closeVisibility === 'always',
                        'group-hover:flex hidden':
                          tabMeta.closeVisibility === 'hover',
                        hidden: tabMeta.closeVisibility === 'never',
                      },
                      'close',
                    ]"
                    class="rounded !p-0.25"
                    @click.stop="emit('removeTab', tabID)"
                  />
                </button>
              </template>
            </draggable>
          </div>
          <div
            class="sticky right-0 flex items-center justify-center flex-shrink-0 overflow-x-auto z-14"
          >
            <span
              v-if="canAddNewTab"
              class="flex items-center justify-center h-full px-3 bg-primaryLight z-8"
            >
              <HoppButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="newText ?? t?.('action.new') ?? 'New'"
                :icon="IconPlus"
                class="rounded create-new-tab !text-secondaryDark !p-1"
                filled
                @click="addTab"
              />
            </span>
          </div>
        </div>
      </div>

      <div v-if="hasActions" :class="mdAndLarger ? 'w-64' : 'w-16'">
        <slot name="actions" />
      </div>

      <input
        type="range"
        min="1"
        :max="MAX_SCROLL_VALUE"
        v-model="thumbPosition"
        class="absolute bottom-0 left-0 hidden slider"
        :class="{
          '!block': scrollThumb.show,
        }"
        :style="[
          `--thumb-width: ${scrollThumb.width}px`,
          `width: calc(100% - ${
            hasActions ? (mdAndLarger ? '19rem' : '7rem') : '3rem'
          })`,
        ]"
        id="myRange"
      />
    </div>
    <div class="w-full h-full contents">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { HoppButtonSecondary } from "../button"
import IconPlus from "~icons/lucide/plus"
import IconX from "~icons/lucide/x"
import { pipe } from "fp-ts/function"
import { not } from "fp-ts/Predicate"
import * as A from "fp-ts/Array"
import * as O from "fp-ts/Option"
import {
  ref,
  ComputedRef,
  computed,
  provide,
  inject,
  watch,
  nextTick,
  useSlots,
} from "vue"
import {
  breakpointsTailwind,
  useBreakpoints,
  useElementSize,
} from "@vueuse/core"
import type { Slot } from "vue"
import draggable from "vuedraggable-es"
import { HoppUIPluginOptions, HOPP_UI_OPTIONS } from "./../../index"

export type TabMeta = {
  label: string | null
  icon: Slot | undefined
  suffix: Slot | undefined
  tabhead: Slot | undefined
  info: string | null
  isRemovable: boolean
  closeVisibility: "hover" | "always" | "never"
}
export type TabProvider = {
  // Whether inactive tabs should remain rendered
  renderInactive: ComputedRef<boolean>
  activeTabID: ComputedRef<string>
  addTabEntry: (tabID: string, meta: TabMeta) => void
  updateTabEntry: (tabID: string, newMeta: TabMeta) => void
  removeTabEntry: (tabID: string) => void
}

const breakpoints = useBreakpoints(breakpointsTailwind)
const mdAndLarger = breakpoints.greater("md")

const { t } = inject<HoppUIPluginOptions>(HOPP_UI_OPTIONS) ?? {}

const props = withDefaults(
  defineProps<{
    styles: string
    modelValue: string
    renderInactiveTabs: boolean
    canAddNewTab: boolean
    newText: string | null
    closeText: string | null
  }>(),
  {
    styles: "",
    renderInactiveTabs: false,
    canAddNewTab: true,
    newText: null,
    closeText: null,
  }
)

const emit = defineEmits<{
  (e: "update:modelValue", newTabID: string): void
  (e: "sort", body: { oldIndex: number; newIndex: number }): void
  (e: "removeTab", tabID: string): void
  (e: "addTab"): void
}>()

const slots = useSlots()

const hasActions = computed(() => {
  return !!slots.actions
})

const throwError = (message: string): never => {
  throw new Error(message)
}

const TAB_WIDTH = 184
const tabEntries = ref<Array<[string, TabMeta]>>([])
const tabStyles = computed(() => ({
  maxWidth: `${tabEntries.value.length * TAB_WIDTH}px`,
  width: "100%",
  minWidth: "0px",
  // transition: "max-width 0.2s",
}))
const dragOptions = {
  group: "tabs",
  animation: 250,
  handle: ".tab",
  draggable: ".tab",
  ghostClass: "cursor-move",
}
const addTabEntry = (tabID: string, meta: TabMeta) => {
  tabEntries.value = pipe(
    tabEntries.value,
    O.fromPredicate(not(A.exists(([id]) => id === tabID))),
    O.map(A.append([tabID, meta] as [string, TabMeta])),
    O.getOrElseW(() => throwError(`Tab with duplicate ID created: '${tabID}'`))
  )
}
const updateTabEntry = (tabID: string, newMeta: TabMeta) => {
  tabEntries.value = pipe(
    tabEntries.value,
    A.findIndex(([id]) => id === tabID),
    O.chain((index) =>
      pipe(
        tabEntries.value,
        A.updateAt(index, [tabID, newMeta] as [string, TabMeta])
      )
    ),
    O.getOrElseW(() => throwError(`Failed to update tab entry: ${tabID}`))
  )
}
const removeTabEntry = (tabID: string) => {
  tabEntries.value = pipe(
    tabEntries.value,
    A.findIndex(([id]) => id === tabID),
    O.chain((index) => pipe(tabEntries.value, A.deleteAt(index))),
    O.getOrElseW(() => throwError(`Failed to remove tab entry: ${tabID}`))
  )
}
const sortTabs = (e: {
  oldDraggableIndex: number
  newDraggableIndex: number
}) => {
  emit("sort", {
    oldIndex: e.oldDraggableIndex,
    newIndex: e.newDraggableIndex,
  })
}
provide<TabProvider>("tabs-system", {
  renderInactive: computed(() => props.renderInactiveTabs),
  activeTabID: computed(() => props.modelValue),
  addTabEntry,
  updateTabEntry,
  removeTabEntry,
})
const selectTab = (id: string) => {
  emit("update:modelValue", id)
}
const addTab = () => {
  emit("addTab")
}

/**
 * Scroll related properties
 */

const MAX_SCROLL_VALUE = 500
const scrollContainer = ref<HTMLElement>()
const { width: scrollContainerWidth } = useElementSize(scrollContainer)
const thumbPosition = ref(0)

const scrollThumb = computed(() => {
  const clientWidth = scrollContainerWidth.value ?? 0
  const scrollWidth = tabEntries.value.length * 184

  return {
    width: (clientWidth / scrollWidth) * clientWidth || 300,
    show: clientWidth ? scrollWidth > clientWidth : false,
  }
})

/*
 * Scroll with mouse wheel
 */
const scroll = (e: WheelEvent) => {
  scrollContainer.value!.scrollLeft += e.deltaY
  scrollContainer.value!.scrollLeft += e.deltaX

  const { scrollWidth, clientWidth, scrollLeft } = scrollContainer.value!
  const maxScroll = scrollWidth - clientWidth
  thumbPosition.value = (scrollLeft / maxScroll) * MAX_SCROLL_VALUE
}

/*
 * Scroll with scrollbar/slider
 * when scroll thumb is dragged or clicked on the scrollbar
 */
watch(thumbPosition, (newVal) => {
  const { scrollWidth, clientWidth } = scrollContainer.value!
  const maxScroll = scrollWidth - clientWidth
  scrollContainer.value!.scrollLeft = maxScroll * (newVal / MAX_SCROLL_VALUE)
})

/*
 * Watch TabID changes
 * and scroll to the tab if it's not visible
 */
watch(
  () => props.modelValue,
  (tabID) => {
    nextTick(() => {
      const element = document.getElementById(`removable-tab-${tabID}`)

      const changeThumbPosition: IntersectionObserverCallback = (
        entries,
        observer
      ) => {
        entries.forEach((entry) => {
          if (entry.target === element && entry.intersectionRatio >= 1.0) {
            // Element is visible now. Stop listening for intersection changes
            observer.disconnect()

            // We still need setTimeout here because the element might not be fully in position yet
            setTimeout(() => {
              const { scrollWidth, clientWidth, scrollLeft } =
                scrollContainer.value!
              const maxScroll = scrollWidth - clientWidth
              thumbPosition.value = (scrollLeft / maxScroll) * MAX_SCROLL_VALUE
            }, 300)
          }
        })
      }

      let observer = new IntersectionObserver(changeThumbPosition, {
        root: null,
        rootMargin: "0px",
        threshold: 1.0,
      })

      if (element) observer.observe(element)
      element?.scrollIntoView({ behavior: "smooth", inline: "center" })
    })
  },
  { immediate: true }
)
</script>

<style scoped lang="scss">
.tabs {
  @apply flex;
  @apply whitespace-nowrap;
  @apply overflow-auto;
  @apply flex-shrink-0;
  @apply after: absolute;
  @apply after: inset-x-0;
  @apply after: bottom-0;
  @apply after: bg-dividerLight;
  @apply after: z-10;
  @apply after: h-0.25;
  @apply after: content-DEFAULT;

  .tab {
    @apply relative;
    @apply flex;
    @apply py-2;
    @apply font-semibold;
    @apply w-46;
    @apply transition;
    @apply flex-1;
    @apply items-center;
    @apply justify-between;
    @apply text-secondaryLight;
    @apply hover: bg-primaryDark;
    @apply hover: text-secondary;
    @apply focus-visible: text-secondaryDark;
    @apply before: absolute;
    @apply before: left-0;
    @apply before: right-0;
    @apply before: top-0;
    @apply before: bg-transparent;
    @apply before: z-2;
    @apply before: h-0.5;
    @apply before: content-DEFAULT;
    @apply focus: before: bg-divider;

    &.active {
      @apply text-secondaryDark;
      @apply bg-primary;
      @apply before: bg-accent;
      @apply after: absolute;
      @apply after: inset-x-0;
      @apply after: bottom-0;
      @apply after: bg-primary;
      @apply after: z-12;
      @apply after: h-0.25;
      @apply after: content-DEFAULT;
    }

    .close {
      @apply opacity-50;

      &.active {
        @apply opacity-100;
      }
    }
  }
}

.create-new-tab {
  @apply after: absolute;
  @apply after: inset-x-0;
  @apply after: bottom-0;
  @apply after: bg-dividerLight;
  @apply after: z-14;
  @apply after: h-0.25;
  @apply after: content-DEFAULT;
}

$slider-height: 4px;

.slider {
  --thumb-width: 0;

  height: $slider-height;

  @apply appearance-none;
  @apply w-full;
  @apply bg-transparent;
  @apply outline-none;
  @apply opacity-0;
  @apply transition;

  &::-webkit-slider-thumb {
    @apply appearance-none;
    @apply min-w-0;
    @apply bg-dividerDark;
    @apply hover:bg-secondaryLight;

    width: var(--thumb-width);
    height: $slider-height;
  }

  &::-moz-range-thumb {
    @apply appearance-none;
    @apply min-w-0;
    @apply bg-dividerDark;
    @apply hover:bg-secondaryLight;

    width: var(--thumb-width);
    height: $slider-height;
  }
}

.group-tabs:hover .slider {
  @apply opacity-100;
}
</style>
