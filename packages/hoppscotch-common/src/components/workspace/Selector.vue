<template>
  <div class="flex flex-col">
    <div class="flex flex-col">
      <div
        v-for="(selectorComponent, index) in workspaceSelectorComponents"
        :key="index"
        class="flex flex-col"
      >
        <component :is="selectorComponent" />
        <hr v-if="index < workspaceSelectorComponents.length - 1" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useService } from "dioc/vue"
import { NewWorkspaceService } from "~/services/new-workspace"
import { TeamsWorkspaceProviderService } from "~/services/new-workspace/providers/teams.workspace"

useService(TeamsWorkspaceProviderService)

const newWorkspaceService = useService(NewWorkspaceService)
const workspaceSelectorComponents =
  newWorkspaceService.workspaceSelectorComponents

</script>
