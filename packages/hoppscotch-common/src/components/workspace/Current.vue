<template>
  <div
    class="flex items-center overflow-x-auto whitespace-nowrap border-b border-dividerLight px-4 py-2 text-tiny text-secondaryLight"
  >
    <span class="truncate">
      {{ workspaceName ?? t("workspace.no_workspace") }}
    </span>
    <icon-lucide-chevron-right v-if="section" class="mx-2" />
    {{ section }}
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "~/composables/i18n"
import { useService } from "dioc/vue"
import { NewWorkspaceService } from "~/services/new-workspace"

defineProps<{
  section?: string
}>()

const t = useI18n()

const workspaceService = useService(NewWorkspaceService)
const activeWorkspaceHandle = workspaceService.activeWorkspaceHandle

const workspaceName = computed(() => {
  if (activeWorkspaceHandle.value?.value.type === "ok") {
    return activeWorkspaceHandle.value.value.data.name
  }

  return undefined
})
</script>
