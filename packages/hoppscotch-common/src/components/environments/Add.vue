<template>
  <HoppSmartModal
    v-if="show"
    :title="t('environment.set_as_environment')"
    @close="hideModal"
  >
    <template #body>
      <div class="flex space-y-4 flex-1 flex-col">
        <div class="flex items-center space-x-8 ml-2">
          <label for="name" class="font-semibold min-w-10">{{
            t("environment.name")
          }}</label>
          <input
            v-model="editingName"
            type="text"
            :placeholder="t('environment.variable')"
            class="input"
          />
        </div>
        <div class="flex items-center space-x-8 ml-2">
          <label for="value" class="font-semibold min-w-10">{{
            t("environment.value")
          }}</label>
          <input type="text" :value="value" class="input" />
        </div>
        <div class="flex items-center space-x-8 ml-2">
          <label for="scope" class="font-semibold min-w-10">
            {{ t("environment.scope") }}
          </label>
          <div
            class="relative flex flex-1 flex-col border border-divider rounded focus-visible:border-dividerDark"
          >
            <EnvironmentsSelector v-model="scope" :is-scope-selector="true" />
          </div>
        </div>
        <div v-if="replaceWithVariable" class="flex space-x-2 mt-3">
          <div class="min-w-18" />
          <HoppSmartCheckbox
            :on="replaceWithVariable"
            title="t('environment.replace_with_variable'))"
            @change="replaceWithVariable = !replaceWithVariable"
          />
          <label for="replaceWithVariable">
            {{ t("environment.replace_with_variable") }}</label
          >
        </div>
      </div>
    </template>
    <template #footer>
      <span class="flex space-x-2">
        <HoppButtonPrimary
          :label="t('action.save')"
          outline
          @click="addEnvironment"
        />
        <HoppButtonSecondary
          :label="t('action.cancel')"
          outline
          filled
          @click="hideModal"
        />
      </span>
    </template>
  </HoppSmartModal>
</template>

<script lang="ts" setup>
import { Environment } from "@hoppscotch/data"
import { ref, watch } from "vue"
import { useI18n } from "~/composables/i18n"
import { useToast } from "~/composables/toast"
import { GQLError } from "~/helpers/backend/GQLClient"
import { TeamEnvironment } from "~/helpers/teams/TeamEnvironment"
import {
  addEnvironmentVariable,
  addGlobalEnvVariable,
} from "~/newstore/environments"
import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import { updateTeamEnvironment } from "~/helpers/backend/mutations/TeamEnvironment"
import { currentActiveTab } from "~/helpers/rest/tab"

const t = useI18n()
const toast = useToast()

const props = defineProps<{
  show: boolean
  position: { top: number; left: number }
  name: string
  value: string
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const hideModal = () => {
  emit("hide-modal")
}

watch(
  () => props.show,
  (newVal) => {
    if (!newVal) {
      scope.value = {
        type: "global",
      }
      editingName.value = ""
      replaceWithVariable.value = false
    }
  }
)

type Scope =
  | {
      type: "global"
    }
  | {
      type: "my-environment"
      environment: Environment
      index: number
    }
  | {
      type: "team-environment"
      environment: TeamEnvironment
    }

const scope = ref<Scope>({
  type: "global",
})

const replaceWithVariable = ref(false)

const editingName = ref(props.name)

const addEnvironment = async () => {
  if (!editingName.value) {
    toast.error(`${t("environment.invalid_name")}`)
    return
  }
  if (scope.value.type === "global") {
    addGlobalEnvVariable({
      key: editingName.value,
      value: props.value,
    })
    toast.success(`${t("environment.updated")}`)
  } else if (scope.value.type === "my-environment") {
    addEnvironmentVariable(scope.value.index, {
      key: editingName.value,
      value: props.value,
    })
    toast.success(`${t("environment.updated")}`)
  } else {
    const newVariables = [
      ...scope.value.environment.environment.variables,
      {
        key: editingName.value,
        value: props.value,
      },
    ]
    await pipe(
      updateTeamEnvironment(
        JSON.stringify(newVariables),
        scope.value.environment.id,
        scope.value.environment.environment.name
      ),
      TE.match(
        (err: GQLError<string>) => {
          console.error(err)
          toast.error(`${getErrorMessage(err)}`)
        },
        () => {
          hideModal()
          toast.success(`${t("environment.updated")}`)
        }
      )
    )()
  }
  if (replaceWithVariable.value) {
    //replace the current tab endpoint with the variable name with << and >>
    const variableName = `<<${editingName.value}>>`
    //replace the currenttab endpoint containing the value in the text with variablename
    currentActiveTab.value.document.request.endpoint =
      currentActiveTab.value.document.request.endpoint.replace(
        props.value,
        variableName
      )
  }

  hideModal()
}

const getErrorMessage = (err: GQLError<string>) => {
  if (err.type === "network_error") {
    return t("error.network_error")
  } else {
    switch (err.error) {
      case "team_environment/not_found":
        return t("team_environment.not_found")
      case "Forbidden resource":
        return t("profile.no_permission")
      default:
        return t("error.something_went_wrong")
    }
  }
}
</script>
