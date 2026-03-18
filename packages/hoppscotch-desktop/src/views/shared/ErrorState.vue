<template>
  <div class="flex flex-col items-center space-y-4">
    <IconLucideAlertCircle class="h-16 w-16 text-red-500" />
    <div class="text-center">
      <h2 class="text-xl font-semibold text-secondaryDark">
        Something went wrong
      </h2>
      <p class="text-red-500 mt-2">{{ error }}</p>
    </div>
    <HoppButtonPrimary
      label="Try Again"
      :icon="IconLucideRefreshCw"
      @click="$emit('retry')"
    />
  </div>
</template>

<script setup lang="ts">
import IconLucideAlertCircle from "~icons/lucide/alert-circle"
import IconLucideRefreshCw from "~icons/lucide/refresh-cw"

interface Props {
  error: string
}

defineProps<Props>()
defineEmits<{
  retry: []
}>()
</script>
