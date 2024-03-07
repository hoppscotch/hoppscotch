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
import { useReadonlyStream } from "~/composables/stream"
import { platform } from "~/platform"

const props = defineProps<{
  section?: string
  isOnlyPersonal?: boolean
}>()

const t = useI18n()

const workspaceService = useService(WorkspaceService)
const workspace = workspaceService.currentWorkspace

const currentUser = useReadonlyStream(
  platform.auth.getProbableUserStream(),
  platform.auth.getProbableUser()
)

const currentWorkspace = computed(() => {
  const personalWorkspaceName = currentUser.value?.displayName
    ? t("workspace.personal_workspace", { name: currentUser.value.displayName })
    : t("workspace.personal")

  if (props.isOnlyPersonal) {
    return personalWorkspaceName
  }
  if (workspace.value.type === "team") {
    return teamWorkspaceName.value
  }
  return personalWorkspaceName
})

const teamWorkspaceName = computed(() => {
  if (workspace.value.type === "team" && workspace.value.teamName) {
    return workspace.value.teamName
  }
  return `${t("workspace.team")}`
})
</script>
