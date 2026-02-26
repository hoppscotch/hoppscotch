<template>
  <!-- Use custom component if platform provides one -->
  <component
    :is="platform.organization?.customOrganizationSwitcherComponent"
    v-if="platform.organization?.customOrganizationSwitcherComponent"
    @close-dropdown="$emit('close-dropdown')"
  />

  <!-- Fallback: no default impl, org switching requires platform-specific service layer -->
  <div v-else class="px-4 py-3">
    <p class="text-xs text-secondary">
      {{ t("organization_sidebar.no_orgs_found") }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { platform } from "~/platform"

defineEmits<{
  (e: "close-dropdown"): void
}>()

const t = useI18n()
</script>
