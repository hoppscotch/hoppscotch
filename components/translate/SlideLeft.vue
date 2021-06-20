<template>
  <transition :appear="appear" name="translate-slide-left">
    <slot></slot>
  </transition>
</template>
<script>
export default {
  props: {
    appear: {
      type: Boolean,
      default: false,
    },
  },
}
</script>

<style scoped lang="scss">
.translate-slide-left {
  &-enter,
  &-leave-to {
    width: 0%;
    opacity: 0;
    margin-left: 0;
  }
  &-enter-to,
  &-leave {
    width: var(--width, 33%);
    margin-left: var(--ml, 0);
    opacity: 1;
  }
  &-enter-active,
  &-leave-active {
    overflow-x: hidden;
    white-space: nowrap;
    transition: width 0.5s ease, opacity 0.3s ease, margin-left 0.5s ease;
  }
}
</style>
