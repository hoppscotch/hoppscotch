<template>
  <div
    class="inline-flex items-center justify-center transition cursor-pointer flex-nowrap group hover:text-secondaryDark"
    role="checkbox"
    :aria-checked="on"
    @click="emit('change')"
  >
    <input
      id="checkbox"
      type="checkbox"
      name="checkbox"
      :checked="on"
      @change="emit('change')"
    />
    <label
      for="checkbox"
      class="pl-0 font-semibold truncate align-middle cursor-pointer"
    >
      <slot></slot>
    </label>
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
input[type="checkbox"] {
  @apply appearance-none;
  @apply hidden;

  & + label {
    @apply inline-flex items-center justify-center;
    @apply cursor-pointer;

    &::before {
      @apply border-divider border-2;
      @apply rounded;
      @apply group-hover: border-accentDark;
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
