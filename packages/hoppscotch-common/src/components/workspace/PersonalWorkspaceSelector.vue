<template>
  <div>
    <div class="flex flex-col">
      <HoppSmartItem
        :label="'Personal Workspace'"
        :info-icon="
          activeWorkspaceInfo?.provider ===
            personalWorkspaceProviderService.providerID &&
          activeWorkspaceInfo.workspaceID === 'personal'
            ? IconCheck
            : undefined
        "
        :active-info-icon="
          activeWorkspaceInfo?.provider ===
            personalWorkspaceProviderService.providerID &&
          activeWorkspaceInfo.workspaceID === 'personal'
        "
        @click="selectWorkspace"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useService } from "dioc/vue"
import { NewWorkspaceService } from "~/services/new-workspace"
import { computed } from "vue"
import { PersonalWorkspaceProviderService } from "~/services/new-workspace/providers/personal.workspace"
import IconCheck from "~icons/lucide/check"

const workspaceService = useService(NewWorkspaceService)
const personalWorkspaceProviderService = useService(
  PersonalWorkspaceProviderService
)

const activeWorkspaceInfo = computed(() => {
  const activeWorkspaceHandleRef =
    workspaceService.activeWorkspaceHandle.value?.get()

  if (activeWorkspaceHandleRef?.value.type === "ok") {
    return {
      provider: activeWorkspaceHandleRef.value.data.providerID,
      workspaceID: activeWorkspaceHandleRef.value.data.workspaceID,
    }
  }

  return undefined
})

function selectWorkspace() {
  workspaceService.activeWorkspaceHandle.value =
    personalWorkspaceProviderService.getPersonalWorkspaceHandle()
}
</script>
