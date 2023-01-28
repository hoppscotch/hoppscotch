<template>
  <Story title="Radio">
    <Variant title="Single">
      <SmartRadio />
    </Variant>
    <Variant title="Group">
      <SmartRadioGroup :radios="radios" :model-value="selected" />
    </Variant>
  </Story>
</template>

<script setup lang="ts">
import { ref } from "vue"

const selected = ref("option1")
const radios = [
  { label: "Option 1", value: "option1" },
  { label: "Option 2", value: "option2" },
  { label: "Option 3", value: "option3" },
]
</script>
