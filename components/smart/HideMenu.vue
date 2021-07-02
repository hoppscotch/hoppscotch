<template>
  <div
    v-tippy="{ theme: 'tooltip' }"
    :title="$t(active ? 'hide_sidebar' : 'show_sidebar')"
    class="
      absolute
      hidden
      md:flex
      items-center
      justify-center
      px-2
      py-1
      bg-divider
      text-secondaryLight
      hover:text-secondary
      my-4
      z-10
      rounded-l
      right-0
      cursor-pointer
    "
    @click="$emit('toggle')"
  >
    <i
      class="
        transition
        origin-center
        transform
        material-icons
        pointer-events-none
      "
      :class="{ 'rotate-180': active }"
    >
      menu_open
    </i>
  </div>
</template>

<script>
export default {
  props: {
    active: {
      type: Boolean,
      default: false,
    },
  },
}
</script>
