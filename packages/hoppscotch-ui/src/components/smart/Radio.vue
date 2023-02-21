<template>
  <HoppSmartItem :label="label" :icon="selected ? IconCircleDot : IconCircle" :active="selected" role="radio"
    :aria-checked="selected" @click="emit('change', value)" />
</template>

<script setup lang="ts">
import { HoppSmartItem } from "."
import IconCircleDot from "~icons/lucide/circle-dot"
import IconCircle from "~icons/lucide/circle"

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
