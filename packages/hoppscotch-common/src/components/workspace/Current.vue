<template>
  <div
    class="flex items-center overflow-x-auto whitespace-nowrap border-b border-dividerLight px-4 py-2 text-tiny text-secondaryLight"
  >
    <span class="truncate">
      {{ currentWorkspace }}
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

const props = defineProps<{
  section?: string
  isOnlyPersonal?: boolean
}>()

const t = useI18n()

const workspaceService = useService(WorkspaceService)
const workspace = workspaceService.currentWorkspace

const currentWorkspace = computed(() => {
  if (props.isOnlyPersonal) {
    return `${t("workspace.personal")}`
  }
  if (workspace.value.type === "team") {
    return teamWorkspaceName.value
  }
  return `${t("workspace.personal")}`
})

const teamWorkspaceName = computed(() => {
  if (workspace.value.type === "team" && workspace.value.teamName) {
    return workspace.value.teamName
  }
  return `${t("workspace.team")}`
})
</script>
