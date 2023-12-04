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
      class="checkbox"
      :checked="on"
      @change="emit('change')"
    />
    <label
      for="checkbox"
      class="pl-0 font-semibold truncate align-middle cursor-pointer"
      :class="{
        'before:mr-2': labelSlot.default
      }"
    >
      <slot></slot>
    </label>
  </div>
</template>

<script setup lang="ts">
import { useSlots } from 'vue';

defineProps({
  on: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits<{
  (e: "change"): void
}>()

// used to check if the default slot is used and add a margin to the label if exists
const labelSlot = useSlots()
</script>

<style lang="scss" scoped>
.checkbox[type="checkbox"] {
  @apply appearance-none;
  @apply hidden;

  & + label {
    @apply inline-flex items-center justify-center;
    @apply cursor-pointer;

    &::before {
      @apply border-2 border-divider;
      @apply rounded;
      @apply group-hover:border-accentDark;
      @apply inline-flex;
      @apply items-center;
      @apply justify-center;
      @apply text-transparent;
      @apply h-4;
      @apply w-4;
      @apply font-icon;
      @apply transition;
      @apply content-["\e5ca"];
    }
  }

  &:checked + label::before {
    @apply bg-accent;
    @apply border-accent;
    @apply text-accentContrast;
  }
}
</style>
