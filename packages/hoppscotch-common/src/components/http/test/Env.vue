<template>
  {{ envName ?? t("filter.none") }}
</template>

<script lang="ts" setup>
import { useService } from "dioc/vue"
import { onMounted, ref } from "vue"
import { useI18n } from "~/composables/i18n"
import { useReadonlyStream, useStream } from "~/composables/stream"
import TeamEnvironmentAdapter from "~/helpers/teams/TeamEnvironmentAdapter"
import {
  environments$,
  selectedEnvironmentIndex$,
  setSelectedEnvironmentIndex,
} from "~/newstore/environments"
import { WorkspaceService } from "~/services/workspace.service"

const t = useI18n()

const workspaceService = useService(WorkspaceService)
const workspace = workspaceService.currentWorkspace

const envName = ref<string | null>(null)

const currentEnv = useStream(
  selectedEnvironmentIndex$,
  { type: "NO_ENV_SELECTED" },
  setSelectedEnvironmentIndex
)

const teamEnvironmentAdapter = new TeamEnvironmentAdapter(undefined)
const teamEnvironmentList = useReadonlyStream(
  teamEnvironmentAdapter.teamEnvironmentList$,
  []
)
const myEnvironments = useReadonlyStream(environments$, [])

function setSelectedEnv() {
  const activeWorkspace = workspace.value

  if (
    activeWorkspace.type === "personal" &&
    currentEnv.value.type === "MY_ENV"
  ) {
    const environment = myEnvironments.value[currentEnv.value.index]
    return {
      type: "MY_ENV",
      index: currentEnv.value.index,
      name: environment.name,
      variables: environment.variables,
    }
  }

  if (activeWorkspace.type === "team" && currentEnv.value.type === "TEAM_ENV") {
    const teamEnv = teamEnvironmentList.value.find(
      (env) =>
        env.id ===
        (currentEnv.value.type === "TEAM_ENV" && currentEnv.value.teamEnvID)
    )

    if (teamEnv) {
      return {
        type: "TEAM_ENV",
        name: teamEnv.environment.name,
        teamEnvID: currentEnv.value.teamEnvID,
        variables: teamEnv.environment.variables,
      }
    }
  }
}

onMounted(() => {
  const selectedEnv = setSelectedEnv()
  envName.value = selectedEnv?.name ?? null
})
</script>
