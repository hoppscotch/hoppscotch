<template>
  <SmartItem
    :label="label"
    :icon="selected ? ButtonChecked : ButtonUnchecked"
    :active="selected"
    role="radio"
    :aria-checked="selected"
    @click.native="emit('change', value)"
  />
</template>

<script setup lang="ts">
import ButtonChecked from "~icons/ic/round-radio-button-checked"
import ButtonUnchecked from "~icons/ic/round-radio-button-unchecked"


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

const emit = defineEmits<{
  (e: "change", value: string): void
}>()
</script>
