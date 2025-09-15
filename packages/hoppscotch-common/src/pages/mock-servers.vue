<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center justify-between p-4 border-b border-divider">
      <div class="flex items-center space-x-4">
        <h2 class="text-xl font-semibold text-secondary">
          {{ t("navigation.mock_servers") }}
        </h2>
      </div>
    </div>

    <div class="flex-1 p-4 overflow-auto">
      <MockServerDashboard />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import MockServerDashboard from "~/components/mockServer/MockServerDashboard.vue"

const t = useI18n()
</script>
