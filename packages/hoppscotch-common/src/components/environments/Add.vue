<template>
  <HoppSmartModal v-if="show" title="Set as Environment" @close="hideModal">
    <template #body>
      <div class="flex space-y-4 py-2 flex-1 flex-col">
        <div class="flex items-center space-x-8">
          <label for="name" class="font-semibold min-w-10">Name</label>
          <input
            v-model="name"
            type="text"
            placeholder="Variable"
            class="input"
          />
        </div>

        <div class="flex items-center space-x-8">
          <label for="value" class="font-semibold min-w-10">Value</label>
          <input type="text" :value="value" class="input" />
        </div>
      </div>
      <div class="flex items-center space-x-8">
        <label for="scope" class="font-semibold min-w-10">Scope</label>
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
                  label="Global"
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
      <div class="flex space-x-2 mt-3">
        <label for="scope" class="font-semibold min-w-18" />
        <HoppSmartCheckbox
          :on="replaceWithVaiable"
          title="Replace with variable "
          @change="replaceWithVaiable = !replaceWithVaiable"
        />
        <label for="replaceWithVariable"> Replace with variable </label>
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
// import { currentCMFocusInstance$ } from "~/newstore/codemirror"
import {
  addEnvironmentVariable,
  addGlobalEnvVariable,
  environments$,
} from "~/newstore/environments"
import { workspaceStatus$ } from "~/newstore/workspace"
import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import { updateTeamEnvironment } from "~/helpers/backend/mutations/TeamEnvironment"

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
      return "Global"
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

// const currentCMFocusInstance = useReadonlyStream(currentCMFocusInstance$, null)

const addEnvironment = async () => {
  if (!name.value) {
    toast.error("Please enter a variable name")
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
    //const variableName = `<<${name.value}>>`
    // console.log("cu-sm-editor", currentCMFocusInstance.value)
    //replace the currenttab endpoint containing the value in the text with variablename
    // currentActiveTab.value.document.request.endpoint =
    //   currentActiveTab.value.document.request.endpoint.replace(
    //     props.value,
    //     variableName
    //   )
    // const editor = EditorView
    //replace the text with the codemirror editor where current focus is
    // const cursor = editor.view.state.selection.main.from
    // const text = editor.view.state.doc.toString()
    // const newText = `${text.substring(
    //   0,
    //   cursor
    // )}${variableName}${text.substring(cursor)}`
    // console.log("newText", newText)
    // editor.view.dispatch({
    //   changes: {
    //     from: 0,
    //     to: text.length,
    //     insert: newText,
    //   },
    // })
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
