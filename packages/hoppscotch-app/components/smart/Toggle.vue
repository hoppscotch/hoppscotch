<template>
  <div
    class="inline-flex items-center justify-center cursor-pointer flex-nowrap"
    @click="$emit('change')"
  >
    <label ref="toggle" class="toggle" :class="{ on: on }">
      <span class="handle"></span>
    </label>
    <label class="pl-0 font-semibold align-middle cursor-pointer">
      <slot></slot>
    </label>
  </div>
</template>

<script>
import { defineComponent } from "@nuxtjs/composition-api"

export default defineComponent({
  props: {
    on: {
      type: Boolean,
      default: false,
    },
  },
})
</script>

<style scoped lang="scss">
$useBorder: true;
$borderColor: var(--divider-color);
$activeColor: var(--divider-color);
$inactiveColor: var(--divider-color);
$inactiveHandleColor: var(--secondary-light-color);
$activeHandleColor: var(--accent-color);
$width: 1.6rem;
$height: 0.6rem;
$indicatorHeight: 0.4rem;
$indicatorWidth: 0.4rem;
$handleSpacing: 0.1rem;
$transition: all 0.2s ease-in-out;

.toggle {
  @apply relative;
  @apply flex;
  @apply items-center;
  @apply justify-center;
  @apply rounded-full;
  @apply p-0;
  @apply mr-4;
  @apply cursor-pointer;
  @apply flex-shrink-0;

  width: $width;
  height: $height;
  border: if($useBorder, 2px solid $borderColor, none);
  background-color: if($useBorder, transparent, $inactiveColor);
  box-sizing: initial;

  .handle {
    @apply absolute;
    @apply flex;
    @apply flex-shrink-0;
    @apply inset-0;
    @apply rounded-full;
    @apply pointer-events-none;

    transition: $transition;
    margin: $handleSpacing;
    background-color: $inactiveHandleColor;
    width: $indicatorWidth;
    height: $indicatorHeight;
  }

  &.on {
    // background-color: $activeColor;
    border-color: $activeColor;

    .handle {
      background-color: $activeHandleColor;
      left: #{$width - $height};
    }
  }
}
</style>
