<template>
  <div
    class="color"
    :data-color="color"
    :class="{ active: active }"
    v-tooltip="{ content: name || color }"
    :style="{ backgroundColor: color }"
  >
    <i v-if="active" class="material-icons activeTick">done</i>
  </div>
</template>

<style scoped lang="scss">
.color {
  @apply inline-flex;
  @apply items-center;
  @apply justify-center;
  @apply relative;
  @apply m-2;
  @apply p-4;
  @apply rounded-full;
  @apply border-2;
  @apply border-bgDarkColor;
  @apply cursor-pointer;
  @apply transition;
  @apply ease-in-out;
  @apply duration-200;

  &.fg {
    @apply text-actColor;
  }

  &.active {
    @apply border-2;
    @apply border-acColor;
  }

  &.fg.active {
    @apply border-2;
    @apply border-fgColor;
  }

  .activeTick {
    @apply absolute;
    @apply m-auto;
    @apply inset-0;
  }
}
</style>

<script>
export default {
  props: {
    color: {
      type: String,
      required: true,
    },
    name: {
      type: String,
    },
    active: {
      type: Boolean,
      default: false,
    },
  },
}
</script>
