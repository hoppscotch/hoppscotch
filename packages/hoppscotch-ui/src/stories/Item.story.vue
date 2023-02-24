<template>
  <Story title="Item">
    <Variant title="Single">
      <HoppSmartItem :label="'Item'" :active-info-icon="false" />
    </Variant>
  </Story>
</template>

<script setup lang="ts">
import { HoppSmartItem } from "../components/smart"
</script>
