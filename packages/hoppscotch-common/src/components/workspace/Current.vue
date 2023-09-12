<template>
  <div
    class="flex items-center px-4 py-2 overflow-x-auto border-b whitespace-nowrap border-dividerLight text-tiny text-secondaryLight"
  >
    <span class="truncate">
      {{
        workspace.type === "personal"
          ? t("workspace.personal")
          : teamWorkspaceName
      }}
    </span>
    <icon-lucide-chevron-right v-if="section" class="mx-2" />
    {{ section }}
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "~/composables/i18n"
import { useService } from "dioc/vue"
import { WorkspaceService } from "~/services/workspace.service"

defineProps<{
  section?: string
}>()

const t = useI18n()

const workspaceService = useService(WorkspaceService)
const workspace = workspaceService.currentWorkspace

const teamWorkspaceName = computed(() => {
  if (workspace.value.type === "team" && workspace.value.teamName) {
    return workspace.value.teamName
  } else {
    return `${t("workspace.team")}`
  }
})
</script>
