<template>
  <Story title="Button">
    <Variant title="Primary">
      <HoppButtonPrimary label="Button" />
    </Variant>
    <Variant title="Secondary">
      <HoppButtonSecondary label="Button" />
    </Variant>
  </Story>
</template>

<script setup lang="ts">
import { HoppButtonPrimary, HoppButtonSecondary } from "../components/button"
</script>
