<template>
  <div
    class="inline-flex items-center justify-center transition cursor-pointer flex-nowrap group hover:text-secondaryDark"
    role="checkbox"
    :aria-checked="on"
    @click="emit('change')"
  >
    <input
      :id="checkboxID"
      type="checkbox"
      :name="name"
      class="checkbox"
      :checked="on"
      @change="emit('change')"
    />
    <label
      :for="checkboxID"
      class="pl-0 font-semibold truncate align-middle cursor-pointer"
    >
      <slot></slot>
    </label>
  </div>
</template>

<script lang="ts">
/*
  This checkboxIDCounter is tracked in the global scope in order to ensure that each checkbox has a unique ID.
  When we use this component multiple times on the same page, we need to ensure that each checkbox has a unique ID.
  This is because the label's for attribute needs to match the checkbox's id attribute.

  That's why we use a global counter that increments each time we use this component.
*/
let checkboxIDCounter = 564275
</script>

<script setup lang="ts">
// Unique ID for checkbox
const checkboxID = `checkbox-${checkboxIDCounter++}`
defineProps({
  on: {
    type: Boolean,
    default: false,
  },
  name: {
    type: String,
    default: "checkbox",
  },
})

const emit = defineEmits<{
  (e: "change"): void
}>()
</script>

<style lang="scss" scoped>
.checkbox[type="checkbox"] {
  @apply relative;
  @apply appearance-none;
  @apply hidden;

  & + label {
    @apply inline-flex items-center justify-center;
    @apply cursor-pointer;
    @apply relative;

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
      @apply mr-2;
      @apply transition;
      content: "";
    }

    &::after {
      content: "";
      border: solid;
      border-width: 0 1.9px 1.9px 0;
      height: 0.6rem;
      width: 0.3rem;
      left: 0.35rem;
      position: absolute;
      top: 2px;
      transform: rotate(45deg);
      opacity: 0;
    }
  }

  &:checked + label::before {
    @apply bg-accent;
    @apply border-accent;
    @apply text-accentContrast;
  }

  &:checked + label::after {
    @apply text-accentContrast;
    opacity: 1;
  }
}
</style>
