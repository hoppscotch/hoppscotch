<template>
  <div class="flex items-center px-4 py-2">
    <i class="mr-4 material-icons text-accentLight"> lock </i>
    <span class="text-secondaryDark">
      {{ env.key }}
    </span>
    <span class="text-secondaryDark">
      {{ ` \xA0 — \xA0 ${env.value}` }}
    </span>
    <span class="text-secondaryLight">
      {{ ` \xA0 ← \xA0 ${env.previousValue}` }}
    </span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  env: {
    key: string
    value: string
    previousValue: string
  }
}>()
</script>
