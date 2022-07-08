<template>
  <div
    class="flex flex-1 h-full flex-nowrap"
    :class="{ 'flex-col h-auto': !vertical }"
  >
    <div
      class="relative tabs hide-scrollbar"
      :class="[{ 'border-r border-dividerLight': vertical }, styles]"
    >
      <div class="flex flex-1">
        <div
          class="flex justify-between flex-1"
          :class="{ 'flex-col': vertical }"
        >
          <div class="flex" :class="{ 'flex-col space-y-2 p-2': vertical }">
            <button
              v-for="([tabID, tabMeta], index) in tabEntries"
              :key="`tab-${index}`"
              class="tab"
              :class="[{ active: value === tabID }, { vertical: vertical }]"
              :aria-label="tabMeta.label || ''"
              role="button"
              @keyup.enter="selectTab(tabID)"
              @click="selectTab(tabID)"
            >
              <SmartIcon
                v-if="tabMeta.icon"
                class="svg-icons"
                :name="tabMeta.icon"
              />
              <tippy
                v-if="vertical && tabMeta.label"
                placement="left"
                theme="tooltip"
                :content="tabMeta.label"
              />
              <span v-else-if="tabMeta.label">{{ tabMeta.label }}</span>
              <span
                v-if="tabMeta.info && tabMeta.info !== 'null'"
                class="tab-info"
              >
                {{ tabMeta.info }}
              </span>
              <span
                v-if="tabMeta.indicator"
                class="w-1 h-1 ml-2 rounded-full bg-accentLight"
              ></span>
            </button>
          </div>
          <div class="flex items-center justify-center">
            <slot name="actions"></slot>
          </div>
        </div>
      </div>
    </div>
    <div
      class="w-full h-full contents"
      :class="{
        '!flex flex-col flex-1 overflow-y-auto hide-scrollbar': vertical,
      }"
    >
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { pipe } from "fp-ts/function"
import * as A from "fp-ts/Array"

import {
  ref,
  ComputedRef,
  computed,
  provide,
  onMounted,
  onUpdated,
  useSlots,
  SetupContext,
  nextTick,
} from "@nuxtjs/composition-api"

import { isEqual } from "lodash"
import Tab from "./Tab.vue"

export type TabMeta = {
  label?: string
  icon?: string
  indicator?: boolean
  info?: string
}

export type TabProvider = {
  // Whether inactive tabs should remain rendered
  renderInactive: ComputedRef<boolean>
  activeTabID: ComputedRef<string>
}

type Slot = SetupContext["slots"] extends {
  [k: string]: infer Slot | undefined
}
  ? Slot
  : never

type VNode = ReturnType<Slot> extends Array<infer VNode> ? VNode : never

const props = defineProps({
  styles: {
    type: String,
    default: "",
  },
  renderInactiveTabs: {
    type: Boolean,
    default: false,
  },
  vertical: {
    type: Boolean,
    default: false,
  },
  value: {
    type: String,
    required: true,
  },
})

const emit = defineEmits<{
  (e: "input", newTabID: string): void
}>()

const tabEntries = ref<Array<[string, TabMeta]>>([])

provide<TabProvider>("tabs-system", {
  renderInactive: computed(() => props.renderInactiveTabs),
  activeTabID: computed(() => props.value),
})

const selectTab = (id: string) => {
  emit("input", id)
}

const slots = useSlots()

type AnyComponent = VNode["componentInstance"]
type TabComponent = InstanceType<typeof Tab>

const isTabComponent = (
  componentInstance: AnyComponent | TabComponent
): componentInstance is TabComponent =>
  !!(componentInstance && "implementsTab" in componentInstance)

const getComponentFromNode = (node: VNode) =>
  node.componentInstance as AnyComponent | TabComponent

const getTabs = () => {
  const nodes = slots?.default?.()

  const tabs = nodes
    ? pipe(
        nodes,
        A.map(getComponentFromNode),
        A.filter(isTabComponent),
        A.map(({ $props }): [string, TabMeta] => [
          $props.id,
          {
            icon: $props.icon,
            label: $props.label,
            indicator: $props.indicator,
            info: $props.info,
          },
        ])
      )
    : []

  if (!isEqual(tabEntries.value, tabs)) {
    tabEntries.value = tabs
  }
}

onUpdated(() => {
  nextTick(getTabs)
})

onMounted(() => {
  getTabs()
})
</script>

<style scoped lang="scss">
.tabs {
  @apply flex;
  @apply whitespace-nowrap;
  @apply overflow-auto;
  @apply flex-shrink-0;

  // &::after {
  //   @apply absolute;
  //   @apply inset-x-0;
  //   @apply bottom-0;
  //   @apply bg-dividerLight;
  //   @apply z-1;
  //   @apply h-0.5;

  //   content: "";
  // }

  .tab {
    @apply relative;
    @apply flex;
    @apply flex-shrink-0;
    @apply items-center;
    @apply justify-center;
    @apply py-2 px-4;
    @apply text-secondary;
    @apply font-semibold;
    @apply cursor-pointer;
    @apply hover:text-secondaryDark;
    @apply focus:outline-none;
    @apply focus-visible:text-secondaryDark;

    .tab-info {
      @apply inline-flex;
      @apply items-center;
      @apply justify-center;
      @apply w-5;
      @apply h-4;
      @apply ml-2;
      @apply text-8px;
      @apply border border-divider;

      @apply rounded;
      @apply text-secondaryLight;
    }

    &::after {
      @apply absolute;
      @apply left-4;
      @apply right-4;
      @apply bottom-0;
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

      .tab-info {
        @apply text-secondary;
        @apply border-dividerDark;
      }

      &::after {
        @apply bg-accent;
      }
    }

    &.vertical {
      @apply p-2;
      @apply rounded;

      &:focus::after {
        @apply hidden;
      }

      &.active {
        @apply text-accent;

        .tab-info {
          @apply text-secondary;
          @apply border-dividerDark;
        }

        &::after {
          @apply hidden;
        }
      }
    }
  }
}
</style>
