<template>
  <SmartItem
    :label="label"
    :icon="selected ? 'radio_button_checked' : 'radio_button_unchecked'"
    :active="selected"
    role="radio"
    :aria-checked="selected"
    @click.native="emit('change', value)"
  />
</template>

<script setup lang="ts">
const emit = defineEmits<{
  (e: "change", value: string): void
}>()

defineProps({
  value: {
    type: String,
    default: "",
  },
  label: {
    type: String,
    default: "",
  },
  selected: {
    type: Boolean,
    default: false,
  },
})
</script>
