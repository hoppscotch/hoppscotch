<template>
  <div class="flex flex-col">
    <SmartRadio
      v-for="(radio, index) in radios"
      :key="`radio-${index}`"
      :value="radio.value"
      :label="radio.label"
      :selected="modelValue === radio.value"
      @change="emit('update:modelValue', radio.value)"
    />
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  (e: "update:modelValue", value: string): void
}>()

defineProps<{
  radios: Array<{
    value: string // The key of the radio option
    label: string
  }>
  modelValue: string // Should be a radio key given in the radios array
}>()
</script>
