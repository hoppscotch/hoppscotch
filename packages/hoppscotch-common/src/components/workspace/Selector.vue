<template>
  <div ref="rootEl">
    <div class="flex flex-col">
      <div
        v-for="(selectorComponent, index) in workspaceSelectorComponents"
        :key="index"
        class="flex flex-col"
      >
        <component :is="selectorComponent" />
        <hr />
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { useService } from "dioc/vue"
import { NewWorkspaceService } from "~/services/new-workspace"
import { TestWorkspaceProviderService } from "~/services/new-workspace/providers/test.workspace"

useService(TestWorkspaceProviderService)

const workspaceService = useService(NewWorkspaceService)
const workspaceSelectorComponents = workspaceService.workspaceSelectorComponents

// TODO: Handle the updates to these actions
//  defineActionHandler("modals.team.new", () => {
//    displayModalAdd(true)
//  })
//
//  defineActionHandler("workspace.switch.personal", switchToPersonalWorkspace)
//  defineActionHandler("workspace.switch", ({ teamId }) => {
//    const team = myTeams.value.find((t) => t.id === teamId)
//    if (team) switchToTeamWorkspace(team)
//  })
</script>
