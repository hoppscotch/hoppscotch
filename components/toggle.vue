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

<style lang="scss" scoped>
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
  display: inline-block;
  cursor: pointer;
}

label.caption {
  vertical-align: middle;
  cursor: pointer;
}

label.toggle {
  position: relative;
  display: inline-block;
  width: $width;
  height: $height;
  border: if($useBorder, 2px solid $borderColor, none);
  background-color: if($useBorder, transparent, $inactiveColor);
  vertical-align: middle;

  border-radius: 32px;
  transition: $transition;
  box-sizing: initial;
  padding: 0;
  margin: 8px 4px;
  cursor: pointer;

  .handle {
    position: absolute;
    display: inline-block;
    top: 0;
    bottom: 0;
    left: 0;
    margin: $handleSpacing;
    background-color: $inactiveHandleColor;

    width: #{$height - ($handleSpacing * 2)};
    height: #{$height - ($handleSpacing * 2)};
    border-radius: 100px;

    pointer-events: none;
    transition: $transition;
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
      default: false
    }
  },

  methods: {
    toggle() {
      const containsOnClass = this.$refs.toggle.classList.toggle("on");
      this.$emit("change", containsOnClass);
    }
  }
};
</script>
