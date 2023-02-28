<template>
  <Story title="Checkbox">
    <Variant title="Single">
      <HoppSmartCheckbox :on="on" />
    </Variant>
  </Story>
</template>

<script setup lang="ts">
import { HoppSmartCheckbox } from "../components/smart"

import { ref } from "vue"

const on = ref(true)
</script>
