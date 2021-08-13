<template>
  <div
    class="cursor-pointer flex-nowrap inline-flex items-center justify-center"
    @click="$emit('change')"
  >
    <label ref="toggle" class="toggle" :class="{ on: on }">
      <span class="handle"></span>
    </label>
    <label class="cursor-pointer pl-0 align-middle truncate">
      <slot></slot>
    </label>
  </div>
</template>

<script>
export default {
  props: {
    on: {
      type: Boolean,
      default: false,
    },
  },
}
</script>

<style scoped lang="scss">
$useBorder: false;
$borderColor: var(--divider-color);
$activeColor: var(--accent-color);
$inactiveColor: var(--divider-color);
$inactiveHandleColor: var(--primary-color);
$activeHandleColor: var(--primary-color);
$width: 1.6rem;
$height: 0.78rem;
$handleSpacing: 0.2rem;
$transition: all 0.2s ease-in-out;

.toggle {
  @apply relative;
  @apply inline-flex;
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
  transition: $transition;
  box-sizing: initial;

  .handle {
    @apply absolute;
    @apply inline-block;
    @apply inset-0;
    @apply rounded-full;
    @apply pointer-events-none;

    transition: $transition;
    margin: $handleSpacing;
    background-color: $inactiveHandleColor;
    width: #{$height - ($handleSpacing * 2)};
    height: #{$height - ($handleSpacing * 2)};
  }

  &.on {
    background-color: $activeColor;
    border-color: $activeColor;

    .handle {
      background-color: $activeHandleColor;
      left: #{$width - $height};
    }
  }
}
</style>
