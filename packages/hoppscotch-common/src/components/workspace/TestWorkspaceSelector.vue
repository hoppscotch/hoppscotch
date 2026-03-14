<template>
  <div>
    <div class="flex flex-col">
      <HoppSmartItem
        v-for="candidate in candidates"
        :key="candidate.id"
        :label="candidate.name"
        :info-icon="
          activeWorkspaceInfo?.provider ===
            testWorkspaceProviderService.providerID &&
          activeWorkspaceInfo.workspaceID === candidate.id
            ? IconCheck
            : undefined
        "
        :active-info-icon="
          activeWorkspaceInfo?.provider ===
            testWorkspaceProviderService.providerID &&
          activeWorkspaceInfo.workspaceID === candidate.id
        "
        @click="selectWorkspace(candidate.id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useService } from "dioc/vue"
import { computed } from "vue"
import { NewWorkspaceService } from "~/services/new-workspace"
import { TestWorkspaceProviderService } from "~/services/new-workspace/providers/test.workspace"
import IconCheck from "~icons/lucide/check"
import * as E from "fp-ts/Either"

const workspaceService = useService(NewWorkspaceService)
const testWorkspaceProviderService = useService(TestWorkspaceProviderService)

const candidates = testWorkspaceProviderService.getWorkspaceCandidates()

const activeWorkspaceInfo = computed(() => {
  const activeWorkspaceHandle = workspaceService.activeWorkspaceHandle.value
  const activeWorkspaceHandleRef = activeWorkspaceHandle?.get()

  if (activeWorkspaceHandleRef?.value.type === "ok") {
    return {
      provider: activeWorkspaceHandleRef.value.data.providerID,
      workspaceID: activeWorkspaceHandleRef.value.data.workspaceID,
    }
  }

  return undefined
})

async function selectWorkspace(workspaceID: string) {
  const result =
    await testWorkspaceProviderService.getWorkspaceHandle(workspaceID)

  // TODO: Re-evaluate this ?
  if (E.isLeft(result)) {
    console.error(result)
    return
  }

  workspaceService.activeWorkspaceHandle.value = result.right
}
</script>
