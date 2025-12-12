<template>
  <div
    class="tabs relative border-dividerLight"
    :class="[vertical ? 'border-r' : 'border-b', styles]"
  >
    <div class="flex flex-1">
      <div class="flex flex-1">
        <router-link
          v-for="(item, index) in items"
          :key="`nav-${index}`"
          v-tippy="{
            theme: 'tooltip',
            placement: 'left',
            content: vertical ? item.label : null,
          }"
          :to="item.route"
          active-class="active"
          exact-active-class="active"
          :exact="item.exactMatch"
          class="tab"
          :class="[{ vertical: vertical }]"
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
        </router-link>
      </div>
      <div class="flex items-center justify-center">
        <slot name="actions"></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from "vue"

export type NavItem = {
  label: string | null
  icon: string | Component | null
  route: string
  exactMatch?: boolean
}

defineProps<{
  items: readonly NavItem[]
  styles?: string
  vertical?: boolean
}>()
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
