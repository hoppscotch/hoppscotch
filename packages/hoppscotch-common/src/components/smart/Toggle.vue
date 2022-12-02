<template>
  <div
    class="inline-flex items-center justify-center cursor-pointer transition flex-nowrap group hover:text-secondaryDark rounded py-0.5 px-1 -my-0.5 -mx-1 focus:outline-none focus-visible:ring focus-visible:ring-accent focus-visible:text-secondaryDark"
    tabindex="0"
    @click="emit('change')"
    @keyup.enter="emit('change')"
  >
    <span ref="toggle" class="toggle" :class="{ on: on }">
      <span class="handle"></span>
    </span>
    <span class="pl-0 font-semibold truncate align-middle cursor-pointer">
      <slot></slot>
    </span>
  </div>
</template>

<script setup lang="ts">
defineProps({
  on: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits<{
  (e: "change"): void
}>()
</script>

<style lang="scss" scoped>
$useBorder: true;
$borderColor: var(--divider-color);
$activeColor: var(--divider-dark-color);
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
  @apply transition;
  @apply group-hover: border-accentDark;
  @apply focus: outline-none;
  @apply focus-visible: border-accentDark;
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
    @apply focus-visible: border-accentDark;

    .handle {
      background-color: $activeHandleColor;
      left: #{$width - $height};
    }
  }
}
</style>
