<template>
  <div class="flex flex-col items-center space-y-4">
    <HoppSmartSpinner />
    <p class="text-secondaryDark">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  message: string
}

defineProps<Props>()
</script>
