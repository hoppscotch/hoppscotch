<template>
  <div class="flex flex-col space-y-4 items-start">
    <SmartRadio
      v-for="(radio, index) in radios"
      :key="`radio-${index}`"
      :value="radio.value"
      :label="radio.label"
      :selected="selected"
      @change="$emit('change', radio.value)"
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  radios: Array<{
    value: string
    label: string
  }>
  selected: string
}>()
</script>
