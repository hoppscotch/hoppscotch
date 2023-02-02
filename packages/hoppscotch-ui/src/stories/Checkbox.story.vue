<template>
  <Story title="Checkbox">
    <Variant title="Single">
      <SmartCheckbox :on="on" />
    </Variant>
  </Story>
</template>

<script setup lang="ts">
import { ref } from "vue"

const on = ref(true)
</script>
