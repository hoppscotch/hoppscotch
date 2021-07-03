<template>
  <transition
    :appear="appear"
    name="translate-fade"
    enter-active-class="duration-500"
    enter-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="duration-500"
    leave-class="opacity-100"
    leave-to-class="opacity-0"
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
