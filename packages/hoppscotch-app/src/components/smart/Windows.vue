<template>
  <div class="h-full flex flex-col hide-scrollbar !overflow-auto">
    <div
      class="relative sticky top-0 inline-flex w-full divide-divider divide-x bg-primaryLight"
    >
      <draggable
        v-bind="dragOptions"
        :list="tabEntries"
        :style="tabsWidth"
        :item-key="'window-'"
        class="flex overflow-x-auto transition hide-scrollbar"
        @sort="sortTabs"
      >
        <template #item="{ element: [tabID, tabMeta] }">
          <button
            :key="`removable-tab-${tabID}`"
            class="tab"
            :class="[{ active: modelValue === tabID }]"
            :aria-label="tabMeta.label || ''"
            role="button"
            @keyup.enter="selectTab(tabID)"
            @click="selectTab(tabID)"
          >
            <div class="flex items-stretch group">
              <span
                class="flex items-center justify-center px-4 cursor-pointer"
              >
                <!-- ICON will be there -->
              </span>
              <span class="truncate">
                {{ tabMeta.label }}
              </span>
            </div>

            <!-- close button -->
            <ButtonSecondary
              :icon="IconX"
              :style="{
                visibility: tabMeta.isRemovable ? 'visible' : 'hidden',
              }"
              :class="[{ active: modelValue === tabID }, 'close']"
              class="rounded my-0.5 mr-0.5 ml-4 !p-1"
              @click.stop="emit('removeTab', tabID)"
            />
          </button>
        </template>
      </draggable>
      <span
        v-if="canAddNewTab"
        class="flex items-center justify-center p-1 bg-primaryLight"
      >
        <ButtonSecondary
          :icon="IconPlus"
          class="sticky right-0 rounded"
          @click="addTab"
        />
      </span>
    </div>
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import IconPlus from "~icons/lucide/plus"
import IconX from "~icons/lucide/x"
import { pipe } from "fp-ts/function"
import { not } from "fp-ts/Predicate"
import * as A from "fp-ts/Array"
import * as O from "fp-ts/Option"
import { ref, ComputedRef, computed, provide } from "vue"
import draggable from "vuedraggable"
import { throwError } from "~/helpers/functional/error"
export type TabMeta = {
  label: string | null
  icon: string | null
  iconColor: string | null
  info: string | null
  isRemovable: boolean
}
export type TabProvider = {
  activeTabID: ComputedRef<string>
  addTabEntry: (tabID: string, meta: TabMeta) => void
  updateTabEntry: (tabID: string, newMeta: TabMeta) => void
  removeTabEntry: (tabID: string) => void
}
const props = defineProps({
  styles: {
    type: String,
    default: "",
  },
  modelValue: {
    type: String,
    required: true,
  },
  canAddNewTab: {
    type: Boolean,
    default: true,
  },
})
const emit = defineEmits<{
  (e: "update:modelValue", newTabID: string): void
  (e: "sort", body: { oldIndex: number; newIndex: number }): void
  (e: "removeTab", tabID: string): void
  (e: "addTab"): void
}>()
const tabEntries = ref<Array<[string, TabMeta]>>([])
const tabsWidth = computed(() => ({
  maxWidth: `${tabEntries.value.length * 184}px`,
  width: "100%",
  minWidth: "0px",
  transition: "max-width 0.2s",
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
  // If we tried to remove the active tabEntries, switch to first tab entry
  if (props.modelValue === tabID)
    if (tabEntries.value.length > 0) selectTab(tabEntries.value[0][0])
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
</script>

<style scoped lang="scss">
.tab {
  @apply relative;
  @apply flex;
  @apply pl-4;
  @apply pr-1;
  @apply py-1;
  @apply font-semibold;
  @apply w-46;
  @apply transition;
  @apply flex-1;
  @apply items-center;
  @apply justify-between;
  @apply text-secondaryLight;
  @apply hover:bg-primaryDark;
  @apply hover:text-secondary;
  @apply focus-visible:text-secondaryDark;
  &::after {
    @apply absolute;
    @apply left-0;
    @apply right-0;
    @apply top-0;
    @apply bg-transparent;
    @apply z-2;
    @apply h-0.5;
    content: "";
  }
  &:focus::after {
    @apply bg-divider;
  }
  &.active {
    @apply text-secondaryDark;
    @apply bg-primary;
    &::after {
      @apply bg-accent;
    }
  }
}
.tab-content {
  @apply p-4;
  @apply hidden;
  &.active {
    @apply flex;
  }
}
.close {
  @apply opacity-50;
  &.active {
    @apply opacity-100;
  }
}
</style>
