<template>
  <div
    class="tabs relative border-dividerLight"
    :class="[vertical ? 'border-r' : 'border-b', styles]"
  >
    <div class="flex flex-1">
      <div
        class="flex flex-1 justify-between"
        :class="{ 'flex-col': vertical }"
      >
        <template v-for="(tabGroup, alignment) in alignedTabs" :key="alignment">
          <div
            class="flex flex-1"
            :class="{
              'flex-col space-y-2 p-2': vertical,
              'justify-end': alignment === 'right',
            }"
          >
            <router-link
              v-for="(item, index) in tabGroup"
              :key="`nav-${index}`"
              :to="item.route"
              v-tippy="{
                theme: 'tooltip',
                placement: 'left',
                content: vertical ? item.label : null,
              }"
              active-class="active"
              exact-active-class="active"
              class="tab"
              :class="[
                { vertical: vertical },
                { '!cursor-not-allowed opacity-75': item.disabled },
              ]"
              :aria-label="item.label || ''"
              role="link"
            >
              <component
                :is="item.icon"
                v-if="item.icon"
                class="svg-icons"
                :class="{ 'mr-2': item.label && !vertical }"
              />
              <span v-if="item.label && !vertical">{{ item.label }}</span>
              <span v-if="item.info && item.info !== 'null'" class="tab-info">
                {{ item.info }}
              </span>
              <span
                v-if="item.indicator"
                class="ml-2 h-1 w-1 rounded-full bg-accentLight"
              ></span>
            </router-link>
          </div>
        </template>
        <div class="flex items-center justify-center">
          <slot name="actions"></slot>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from "vue"
import { computed } from "vue"

export type NavItem = {
  label: string | null
  icon: string | Component | null
  route: string
  indicator: boolean
  info: string | null
  disabled: boolean
  alignLast: boolean
  exactMatch?: boolean
}

const props = defineProps<{
  items: readonly NavItem[]
  styles?: string
  vertical?: boolean
}>()

const alignedTabs = computed(() => {
  const leftTabs = props.items.filter((item) => !item.alignLast)
  const rightTabs = props.items.filter((item) => item.alignLast)
  return { left: leftTabs, right: rightTabs }
})
</script>

<style lang="scss" scoped>
.tabs {
  @apply flex;
  @apply whitespace-nowrap;
  @apply overflow-auto;
  @apply flex-shrink-0;

  .tab {
    @apply relative;
    @apply flex;
    @apply flex-shrink-0;
    @apply items-center;
    @apply justify-center;
    @apply px-4 py-2;
    @apply text-secondary;
    @apply font-semibold;
    @apply cursor-pointer;
    @apply hover:text-secondaryDark;
    @apply focus:outline-none;
    @apply focus-visible:text-secondaryDark;
    @apply after:absolute;
    @apply after:left-4;
    @apply after:right-4;
    @apply after:bottom-0;
    @apply after:bg-transparent;
    @apply after:z-[2];
    @apply after:h-0.5;
    @apply after:content-[''];
    @apply focus:after:bg-divider;

    .tab-info {
      @apply inline-flex;
      @apply items-center;
      @apply justify-center;
      @apply px-1;
      @apply min-w-[1rem];
      @apply h-4;
      @apply ml-2;
      @apply text-[8px];
      @apply border border-divider;
      @apply rounded;
      @apply text-secondaryLight;
    }

    &.active {
      @apply text-secondaryDark;
      @apply after:bg-accent;

      .tab-info {
        @apply text-secondary;
        @apply border-dividerDark;
      }
    }

    &.vertical {
      @apply p-2;
      @apply rounded;
      @apply focus:after:hidden;

      &.active {
        @apply text-accent;
        @apply after:hidden;

        .tab-info {
          @apply text-secondary;
          @apply border-dividerDark;
        }
      }
    }
  }
}
</style>
