<template>
  <HoppSmartModal
    v-if="show"
    :title="t('environment.set_as_environment')"
    @close="hideModal"
  >
    <template #body>
      <div class="flex space-y-4 py-2 flex-1 flex-col">
        <div class="flex items-center space-x-8">
          <label for="name" class="font-semibold min-w-10">{{
            t("environment.name")
          }}</label>
          <input
            v-model="name"
            type="text"
            :placeholder="t('environment.variable')"
            class="input"
          />
        </div>

        <div class="flex items-center space-x-8">
          <label for="value" class="font-semibold min-w-10">{{
            t("environment.value")
          }}</label>
          <input type="text" :value="value" class="input" />
        </div>
      </div>
      <div class="flex items-center space-x-8">
        <label for="scope" class="font-semibold min-w-10">
          {{ t("environment.scope") }}
        </label>
        <div class="relative flex flex-1 flex-col">
          <tippy interactive trigger="click" theme="popover" class="flex-1">
            <span class="select-wrapper">
              <HoppButtonSecondary
                :label="scopeLabel"
                class="flex-1 !justify-start pr-8 rounded-none"
              />
            </span>
            <template #content="{ hide }">
              <div
                ref="methodTippyActions"
                class="flex flex-col focus:outline-none flex-1"
                :class="{
                  'divide-y divide-divider':
                    (workspace.type === 'personal' &&
                      myEnvironments.length > 0) ||
                    (workspace.type === 'team' &&
                      teamEnvironmentList.length > 0),
                }"
                tabindex="0"
                @keyup.escape="hide()"
              >
                <HoppSmartItem
                  :label="t('environment.global')"
                  :info-icon="scope.type === 'global' ? IconCheck : undefined"
                  :active-info-icon="scope.type === 'global'"
                  @click="
                    () => {
                      updateSelectedEnvironment({
                        type: 'global',
                      })
                      hide()
                    }
                  "
                />
                <span
                  v-if="workspace.type === 'personal'"
                  class="flex flex-col flex-1"
                >
                  <HoppSmartItem
                    v-for="(environment, index) in myEnvironments"
                    :key="environment.id"
                    :label="environment.name"
                    :info-icon="
                      scope.type === 'my-environment' &&
                      scope.environment.id === environment.id
                        ? IconCheck
                        : undefined
                    "
                    :active-info-icon="
                      scope.type === 'my-environment' &&
                      scope.environment.id === environment.id
                    "
                    @click="
                      () => {
                        updateSelectedEnvironment({
                          type: 'my-environment',
                          environment,
                          index,
                        })
                        hide()
                      }
                    "
                  />
                </span>
                <span
                  v-else-if="workspace.type === 'team'"
                  class="flex flex-col flex-1"
                >
                  <div
                    v-if="teamListLoading"
                    class="flex flex-col items-center justify-center p-4"
                  >
                    <HoppSmartSpinner class="my-4" />
                    <span class="text-secondaryLight">{{
                      t("state.loading")
                    }}</span>
                  </div>
                  <HoppSmartItem
                    v-for="environment in teamEnvironmentList"
                    :key="environment.id"
                    :label="environment.environment.name"
                    @click="
                      () => {
                        updateSelectedEnvironment({
                          type: 'team-environment',
                          environment,
                        })
                        hide()
                      }
                    "
                  />
                  <div
                    v-if="!teamListLoading && teamAdapterError"
                    class="flex flex-col items-center py-4"
                  >
                    <icon-lucide-help-circle class="mb-4 svg-icons" />
                    {{ getErrorMessage(teamAdapterError) }}
                  </div>
                </span>
              </div>
            </template>
          </tippy>
        </div>
      </div>
      <div v-if="replaceWithVariable" class="flex space-x-2 mt-3">
        <div class="min-w-18" />
        <HoppSmartCheckbox
          :on="replaceWithVaiable"
          title="t('environment.replace_with_variable'))"
          @change="replaceWithVaiable = !replaceWithVaiable"
        />
        <label for="replaceWithVariable">
          {{ t("environment.replace_with_variable") }}</label
        >
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
import { computed, ref, watch } from "vue"
import { useI18n } from "~/composables/i18n"
import { useReadonlyStream } from "~/composables/stream"
import { useToast } from "~/composables/toast"
import { GQLError } from "~/helpers/backend/GQLClient"
// import { currentActiveTab } from "~/helpers/rest/tab"
import { TeamEnvironment } from "~/helpers/teams/TeamEnvironment"
import TeamEnvironmentAdapter from "~/helpers/teams/TeamEnvironmentAdapter"
import {
  addEnvironmentVariable,
  addGlobalEnvVariable,
  environments$,
} from "~/newstore/environments"
import { workspaceStatus$ } from "~/newstore/workspace"
import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import { updateTeamEnvironment } from "~/helpers/backend/mutations/TeamEnvironment"
import { currentActiveTab } from "~/helpers/rest/tab"
import IconCheck from "~icons/lucide/check"

const t = useI18n()
const toast = useToast()

const props = defineProps<{
  show: boolean
  position: { top: number; left: number }
  name: string
  value: string
  replaceWithVariable: boolean
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const hideModal = () => {
  emit("hide-modal")
}

const workspace = useReadonlyStream(workspaceStatus$, { type: "personal" })

const myEnvironments = useReadonlyStream(environments$, [])

const teamEnvListAdapter = new TeamEnvironmentAdapter(undefined)
const teamListLoading = useReadonlyStream(teamEnvListAdapter.loading$, false)
const teamAdapterError = useReadonlyStream(teamEnvListAdapter.error$, null)
const teamEnvironmentList = useReadonlyStream(
  teamEnvListAdapter.teamEnvironmentList$,
  []
)

watch(
  () => workspace.value,
  (newVal) => {
    if (newVal.type === "team" && newVal.teamID) {
      teamEnvListAdapter.changeTeamID(newVal.teamID)
    }
  }
)

watch(
  () => props.show,
  (newVal) => {
    if (!newVal) {
      scope.value = {
        type: "global",
      }
      name.value = ""
      replaceWithVaiable.value = false
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

const replaceWithVaiable = ref(false)

const name = ref("")

const scopeLabel = computed(() => {
  switch (scope.value.type) {
    case "global":
      return t("environment.global")
    case "my-environment":
      return scope.value.environment.name
    case "team-environment":
      return scope.value.environment.environment.name
    default:
      return "Global"
  }
})

const updateSelectedEnvironment = (newScope: Scope) => {
  scope.value = newScope
}

const addEnvironment = async () => {
  if (!name.value) {
    toast.error(`${t("environment.invalid_name")}`)
    return
  }
  if (scope.value.type === "global") {
    addGlobalEnvVariable({
      key: name.value,
      value: props.value,
    })
    toast.success(`${t("environment.updated")}`)
  } else if (scope.value.type === "my-environment") {
    addEnvironmentVariable(scope.value.index, {
      key: name.value,
      value: props.value,
    })
    toast.success(`${t("environment.updated")}`)
  } else {
    const newVariables = [
      ...scope.value.environment.environment.variables,
      {
        key: name.value,
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
  if (replaceWithVaiable.value) {
    //replace the current tab endpoint with the variable name with << and >>
    const variableName = `<<${name.value}>>`
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

<style lang="scss" scoped>
.input {
  @apply flex px-4 py-2 border rounded bg-primaryContrast border-divider hover:border-dividerDark focus-visible:border-dividerDark flex-1;
}
</style>
