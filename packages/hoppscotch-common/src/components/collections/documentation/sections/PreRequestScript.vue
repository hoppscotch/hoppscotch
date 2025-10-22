<template>
  <div v-if="preRequestScript" class="space-y-2">
    <h2
      class="text-sm font-semibold text-secondaryDark flex items-end px-4 p-2 border-b border-divider"
    >
      Pre-request Script
    </h2>
    <div
      class="bg-primaryDark rounded-md border border-divider overflow-hidden"
    >
      <div
        class="flex items-center justify-between p-2 bg-divider/30 border-b border-divider"
      >
        <div class="text-sm font-medium text-secondaryDark flex items-center">
          <icon-lucide-code-2 class="mr-2" size="14" />
          JavaScript
        </div>
      </div>
      <pre
        class="bg-primaryLight/30 p-3 overflow-auto max-h-64 text-sm font-mono text-secondaryLight m-0"
        >{{ preRequestScript }}</pre
      >
    </div>
    <div
      class="mt-2 p-3 bg-primaryDark rounded-md border-l-4 border-accent text-xs text-secondaryLight"
    >
      <div class="flex items-start">
        <icon-lucide-lightbulb
          class="mr-2 text-accent flex-shrink-0 mt-0.5"
          size="14"
        />
        <div>
          Pre-request scripts run before the request is sent and can be used to
          modify request parameters, set variables, or perform environment
          setup.
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
defineProps<{
  preRequestScript: string | null | undefined
}>()
</script>
