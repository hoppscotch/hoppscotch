<template>
  <div class="flex flex-col">
    <SmartRadio
      v-for="(radio, index) in radios"
      :key="`radio-${index}`"
      :value="radio.value"
      :label="radio.label"
      :selected="value === radio.value"
      @change="emit('input', radio.value)"
    />
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  (e: "input", value: string): void
}>()

defineProps<{
  radios: Array<{
    value: string // The key of the radio option
    label: string
  }>
  value: string // Should be a radio key given in the radios array
}>()
</script>
