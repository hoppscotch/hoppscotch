<template>
  <div @click="toggle()">
    <label class="toggle" :class="{on: on}" ref="toggle">
      <span class="handle"></span>
    </label>
    <label class="caption"><slot /></label>
  </div>
</template>

<style lang="scss" scoped>
  $useBorder: true;
  $borderColor: var(--fg-color);
  $activeColor: var(--ac-color);
  $inactiveColor: var(--fg-color);

  $inactiveHandleColor: $inactiveColor;
  $activeHandleColor: var(--fg-color);

  $width: 50px;
  $height: 20px;
  $handleSpacing: 4px;

  $transition: all 0.2s ease-in-out;

  div {
    display: inline-block;
  }

  label.caption {
    margin-left: 5px;
    vertical-align: middle;
  }

  label.toggle {
    position: relative;
    display: inline-block;
    width: $width;
    height: $height;
    border: if($useBorder, 2px solid $borderColor, none);
    background-color: if($useBorder, transparent, $inactiveColor);
    vertical-align: middle;

    border-radius: 100px;
    transition: $transition;
    box-sizing: initial;
    padding: 0;
    margin: 10px 5px;

    .handle {
      position: absolute;
      display: inline-block;
      top: 0;
      bottom: 0;
      left: 0;
      margin: $handleSpacing;
      background-color: $inactiveHandleColor;

      width: #{ $height - ($handleSpacing * 2) };
      height: #{ $height - ($handleSpacing * 2) };
      border-radius: 100px;

      pointer-events: none;
      transition: $transition;

      box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
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
          'on': {
              type: Boolean,
              default: false
          }
      },

      methods: {
          toggle () {
              this.$refs.toggle.classList.toggle("on");
              this.$emit('change', this.$refs.toggle.classList.contains("on"));
          }
      }

  }
</script>
