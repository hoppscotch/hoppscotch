<template>
  <Story title="Radio">
    <Variant title="Single">
      <HoppSmartRadio />
    </Variant>
    <Variant title="Group">
      <HoppSmartRadioGroup :radios="radios" :model-value="selected" />
    </Variant>
  </Story>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { HoppSmartRadio, HoppSmartRadioGroup } from "../components/smart"

const selected = ref("option1")
const radios = [
  { label: "Option 1", value: "option1" },
  { label: "Option 2", value: "option2" },
  { label: "Option 3", value: "option3" },
]
</script>
