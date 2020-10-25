<template>
  <div @click="toggle()">
    <label class="toggle" :class="{ on: on }" ref="toggle">
      <span class="handle"></span>
    </label>
    <label class="caption">
      <slot />
    </label>
  </div>
</template>

<style scoped lang="scss">
$useBorder: false;
$borderColor: var(--fg-light-color);
$activeColor: var(--ac-color);
$inactiveColor: var(--fg-light-color);
$inactiveHandleColor: var(--bg-color);
$activeHandleColor: var(--act-color);
$width: 32px;
$height: 16px;
$handleSpacing: 4px;
$transition: all 0.2s ease-in-out;

div {
  @apply inline-block;
  @apply cursor-pointer;
}

label.caption {
  @apply align-middle;
  @apply cursor-pointer;
}

label.toggle {
  @apply relative;
  @apply inline-block;
  @apply align-middle;
  @apply rounded-full;
  @apply p-0;
  @apply my-4;
  @apply mx-2;
  @apply cursor-pointer;

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

<script>
export default {
  props: {
    on: {
      type: Boolean,
      default: false,
    },
  },

  methods: {
    toggle() {
      const containsOnClass = this.$refs.toggle.classList.toggle("on")
      this.$emit("change", containsOnClass)
    },
  },
}
</script>
