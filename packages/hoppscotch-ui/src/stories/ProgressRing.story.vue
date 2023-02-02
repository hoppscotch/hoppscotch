<template>
  <Story title="Progress Ring">
    <SmartProgressRing
      class="mr-2 text-red-500"
      :radius="8"
      :stroke="1.5"
      :progress="(failedTests / totalTests) * 100"
    />
  </Story>
</template>

<script setup lang="ts">
const totalTests = 10
const failedTests = 2
</script>
