<template>
  <div v-if="!activeWorkspaceHandle">No Workspace Selected.</div>

  <NewCollectionsRest
    v-else-if="platform === 'rest'"
    :picked="picked"
    :save-request="saveRequest"
    :workspace-handle="activeWorkspaceHandle"
    @select="(payload) => emit('select', payload)"
  />

  <NewCollectionsGraphql
    v-else-if="platform === 'graphql'"
    :picked="picked"
    :save-request="saveRequest"
    :workspace-handle="activeWorkspaceHandle"
    @select="(payload) => emit('select', payload)"
  />
</template>

<script setup lang="ts">
import { useService } from "dioc/vue"

import { Picked } from "~/helpers/types/HoppPicked"
import { NewWorkspaceService } from "~/services/new-workspace"

defineProps<{
  picked?: Picked | null
  platform: "rest" | "graphql"
  saveRequest?: boolean
}>()

const emit = defineEmits<{
  (event: "select", payload: Picked | null): void
}>()

const workspaceService = useService(NewWorkspaceService)

const activeWorkspaceHandle = workspaceService.activeWorkspaceHandle
</script>
