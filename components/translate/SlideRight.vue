<template>
  <transition
    :appear="appear"
    name="translate-slide-right"
    enter-active-class="transition transform"
    enter-class="-translate-x-full"
    enter-to-class="translate-x-0"
    leave-active-class="transition transform"
    leave-class="translate-x-0"
    leave-to-class="-translate-x-full"
  >
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
