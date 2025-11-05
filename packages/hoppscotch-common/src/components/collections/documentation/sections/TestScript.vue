<template>
  <div v-if="testScript" class="space-y-2">
    <h2
      class="text-sm font-semibold text-secondaryDark flex items-end px-4 p-2 border-b border-divider"
    >
      Tests
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
        >{{ testScript }}</pre
      >
    </div>
  </div>
</template>

<script lang="ts" setup>
defineProps<{
  testScript: string | null | undefined
}>()
</script>
