<template>
  <div
    class="cursor-pointer flex-nowrap transition inline-flex items-center justify-center group hover:text-secondaryDark"
    @click="$emit('change')"
  >
    <input
      id="checkbox"
      type="checkbox"
      name="checkbox"
      :checked="on"
      @change="$emit('change')"
    />
    <label
      for="checkbox"
      class="cursor-pointer font-semibold pl-0 align-middle"
    >
      <slot></slot>
    </label>
  </div>
</template>

<script>
import { defineComponent } from "@nuxtjs/composition-api"

export default defineComponent({
  props: {
    on: {
      type: Boolean,
      default: false,
    },
  },
})
</script>

<style scoped lang="scss">
input[type="checkbox"] {
  @apply appearance-none;
  @apply hidden;

  & + label {
    @apply inline-flex items-center justify-center;
    @apply cursor-pointer;

    &::before {
      @apply border-divider border-2;
      @apply rounded;
      @apply group-hover:border-accentDark;
      @apply inline-flex;
      @apply items-center;
      @apply justify-center;
      @apply text-transparent;
      @apply h-4;
      @apply w-4;
      @apply font-icon;
      @apply mr-3;
      @apply transition;

      content: "\e876";
    }
  }

  &:checked + label::before {
    @apply bg-accent;
    @apply border-accent;
    @apply text-accentContrast;
  }
}
</style>
