<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t(`environment.${action}`)"
    @close="hideModal"
  >
    <template #body>
      <div class="flex flex-col px-2">
        <HoppSmartInput
          v-model="editingName"
          placeholder=" "
          :input-styles="['floating-input', isViewer && 'opacity-25']"
          :label="t('action.label')"
          :disabled="isViewer"
          @submit="saveEnvironment"
        />

        <div class="my-4 flex flex-col border border-divider rounded">
          <div
            v-if="evnExpandError"
            class="mb-2 w-full overflow-auto whitespace-normal rounded bg-primaryLight px-4 py-2 font-mono text-red-400"
          >
            {{ t("environment.nested_overflow") }}
          </div>
          <HoppSmartTabs v-model="selectedEnvOption" render-inactive-tabs>
            <template #actions>
              <div class="flex flex-1 items-center justify-between">
                <div class="flex">
                  <HoppButtonSecondary
                    v-tippy="{ theme: 'tooltip' }"
                    to="https://docs.hoppscotch.io/documentation/features/environments"
                    blank
                    :title="t('app.wiki')"
                    :icon="IconHelpCircle"
                  />
                  <HoppButtonSecondary
                    v-tippy="{ theme: 'tooltip' }"
                    :title="t('action.clear_all')"
                    :icon="clearIcon"
                    @click="clearContent()"
                  />
                  <HoppButtonSecondary
                    v-tippy="{ theme: 'tooltip' }"
                    :icon="IconPlus"
                    :title="t('add.new')"
                    @click="addEnvironmentVariable"
                  />
                </div>
              </div>
            </template>
            <HoppSmartTab id="variables" :label="t('environment.variables')">
              <div
                class="divide-y divide-dividerLight rounded border border-divider"
              >
                <div
                  v-for="({ id, env }, index) in nonSecretVars"
                  :key="`variable-${id}-${index}`"
                  class="flex divide-x divide-dividerLight"
                >
                  <input
                    v-model="env.key"
                    v-focus
                    class="flex flex-1 bg-transparent px-4 py-2"
                    :placeholder="`${t('count.variable', {
                      count: index + 1,
                    })}`"
                    :name="'param' + index"
                  />
                  <SmartEnvInput
                    v-model="env.value"
                    :select-text-on-mount="env.key === editingVariableName"
                    :placeholder="`${t('count.value', { count: index + 1 })}`"
                    :envs="liveEnvs"
                    :name="'value' + index"
                  />
                  <div class="flex">
                    <HoppButtonSecondary
                      id="variable"
                      v-tippy="{ theme: 'tooltip' }"
                      :title="t('action.remove')"
                      :icon="IconTrash"
                      color="red"
                      @click="removeEnvironmentVariable(id)"
                    />
                  </div>
                </div>
                <HoppSmartPlaceholder
                  v-if="nonSecretVars.length === 0"
                  :src="`/images/states/${colorMode.value}/blockchain.svg`"
                  :alt="`${t('empty.environments')}`"
                  :text="t('empty.environments')"
                >
                  <template #body>
                    <HoppButtonSecondary
                      :label="`${t('add.new')}`"
                      filled
                      :icon="IconPlus"
                      @click="addEnvironmentVariable"
                    />
                  </template>
                </HoppSmartPlaceholder>
              </div>
            </HoppSmartTab>
            <HoppSmartTab id="secret" :label="t('environment.secret')">
              <div
                class="divide-y divide-dividerLight rounded border border-divider"
              >
                <div
                  v-for="({ id, env }, index) in secretVars"
                  :key="`variable-${id}-${index}`"
                  class="flex divide-x divide-dividerLight"
                >
                  <input
                    v-model="env.key"
                    v-focus
                    class="flex flex-1 bg-transparent px-4 py-2"
                    :placeholder="`${t('count.variable', {
                      count: index + 1,
                    })}`"
                    :name="'param' + index"
                  />
                  <SmartEnvInput
                    v-model="env.value"
                    :select-text-on-mount="env.key === editingVariableName"
                    :placeholder="`${t('count.value', { count: index + 1 })}`"
                    :envs="liveEnvs"
                    :name="'value' + index"
                    :secret="true"
                  />
                  <div class="flex">
                    <HoppButtonSecondary
                      id="variable"
                      v-tippy="{ theme: 'tooltip' }"
                      :title="t('action.remove')"
                      :icon="IconTrash"
                      color="red"
                      @click="removeEnvironmentVariable(id)"
                    />
                  </div>
                </div>
                <HoppSmartPlaceholder
                  v-if="secretVars.length === 0"
                  :src="`/images/states/${colorMode.value}/blockchain.svg`"
                  :alt="`${t('empty.secret_environments')}`"
                  :text="t('empty.secret_environments')"
                >
                  <template #body>
                    <HoppButtonSecondary
                      :label="`${t('add.new')}`"
                      filled
                      :icon="IconPlus"
                      @click="addEnvironmentVariable"
                    />
                  </template>
                </HoppSmartPlaceholder>
              </div>
            </HoppSmartTab>
          </HoppSmartTabs>
        </div>
      </div>
    </template>
    <template v-if="!isViewer" #footer>
      <span class="flex space-x-2">
        <HoppButtonPrimary
          :label="`${t('action.save')}`"
          :loading="isLoading"
          outline
          @click="saveEnvironment"
        />
        <HoppButtonSecondary
          :label="`${t('action.cancel')}`"
          outline
          filled
          @click="hideModal"
        />
      </span>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"
import * as E from "fp-ts/Either"
import * as A from "fp-ts/Array"
import * as O from "fp-ts/Option"
import * as TE from "fp-ts/TaskEither"
import { flow, pipe } from "fp-ts/function"
import { Environment, parseTemplateStringE } from "@hoppscotch/data"
import { refAutoReset } from "@vueuse/core"
import { clone } from "lodash-es"
import { useToast } from "@composables/toast"
import { useI18n } from "~/composables/i18n"
import {
  createTeamEnvironment,
  updateTeamEnvironment,
} from "~/helpers/backend/mutations/TeamEnvironment"
import { GQLError } from "~/helpers/backend/GQLClient"
import { TeamEnvironment } from "~/helpers/teams/TeamEnvironment"
import { useColorMode } from "~/composables/theming"
import IconTrash from "~icons/lucide/trash"
import IconTrash2 from "~icons/lucide/trash-2"
import IconDone from "~icons/lucide/check"
import IconPlus from "~icons/lucide/plus"
import IconHelpCircle from "~icons/lucide/help-circle"
import { platform } from "~/platform"
import { useService } from "dioc/vue"
import { SecretEnvironmentService } from "~/services/secret-environment.service"

type EnvironmentVariable = {
  id: number
  env: {
    key: string
    value: string
    secret: boolean
  }
}

const t = useI18n()
const toast = useToast()
const colorMode = useColorMode()

const props = withDefaults(
  defineProps<{
    show: boolean
    action: "edit" | "new"
    editingEnvironment?: TeamEnvironment | null
    editingTeamId: string | undefined
    editingVariableName?: string | null
    isViewer?: boolean
    isSecretOptionSelected?: boolean
    envVars?: () => Environment["variables"]
  }>(),
  {
    show: false,
    action: "edit",
    editingEnvironment: null,
    editingTeamId: "",
    editingVariableName: null,
    isViewer: false,
    isSecretOptionSelected: false,
    envVars: () => [],
  }
)

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const idTicker = ref(0)

const editingName = ref<string | null>(null)
const editingID = ref<string | null>(null)
const vars = ref<EnvironmentVariable[]>([
  { id: idTicker.value++, env: { key: "", value: "", secret: false } },
])

const secretEnvironmentService = useService(SecretEnvironmentService)

const secretVars = computed(() =>
  pipe(
    vars.value,
    A.filter((e) => e.env.secret)
  )
)

const nonSecretVars = computed(() =>
  pipe(
    vars.value,
    A.filter((e) => !e.env.secret)
  )
)

type SelectedEnv = "variables" | "secret"

const selectedEnvOption = ref<SelectedEnv>("variables")

const clearIcon = refAutoReset<typeof IconTrash2 | typeof IconDone>(
  IconTrash2,
  1000
)

const evnExpandError = computed(() => {
  const variables = pipe(
    vars.value,
    A.map((e) => e.env)
  )

  return pipe(
    variables,
    A.exists(({ value }) => E.isLeft(parseTemplateStringE(value, variables)))
  )
})

const liveEnvs = computed(() => {
  if (evnExpandError.value) {
    return []
  }
  return [...vars.value.map((x) => ({ ...x.env, source: editingName.value! }))]
})

watch(
  () => props.show,
  (show) => {
    if (show) {
      editingName.value = props.editingEnvironment?.environment.name ?? null
      selectedEnvOption.value = props.isSecretOptionSelected
        ? "secret"
        : "variables"
      if (props.action === "new") {
        vars.value = pipe(
          props.envVars() ?? [],
          A.map((e) => ({
            id: idTicker.value++,
            env: clone(e),
          }))
        )
      } else if (props.editingEnvironment !== null) {
        editingID.value = props.editingEnvironment.id
        vars.value = pipe(
          props.editingEnvironment.environment.variables ?? [],
          A.mapWithIndex((index, e) => ({
            id: idTicker.value++,
            env: {
              key: e.key,
              value: e.secret
                ? secretEnvironmentService.getSecretEnvironmentVariable(
                    editingID.value ?? "",
                    index
                  )?.value ?? ""
                : e.value,
              secret: e.secret,
            },
          }))
        )
      }
    }
  }
)

const clearContent = () => {
  vars.value = []
  clearIcon.value = IconDone
  toast.success(`${t("state.cleared")}`)
}

const addEnvironmentVariable = () => {
  vars.value.push({
    id: idTicker.value++,
    env: {
      key: "",
      value: "",
      secret: selectedEnvOption.value === "secret",
    },
  })
}

const removeEnvironmentVariable = (id: number) => {
  const variable = vars.value
    .map((e, index) => {
      if (e.id === id) {
        return {
          env: e.env,
          index,
        }
      }
      return null
    })
    .filter((e) => e !== null)[0]

  if (variable) vars.value = vars.value.filter((e) => e.id !== id)
}

const isLoading = ref(false)

const saveEnvironment = async () => {
  isLoading.value = true

  if (!editingName.value) {
    toast.error(`${t("environment.invalid_name")}`)
    return
  }

  const filterdVariables = pipe(
    vars.value,
    A.filterMap(
      flow(
        O.fromPredicate((e) => e.env.key !== ""),
        O.map((e) => e.env)
      )
    )
  )

  const secretVariables = pipe(
    filterdVariables,
    A.filterMapWithIndex((i, e) =>
      e.secret ? O.some({ key: e.key, value: e.value, varIndex: i }) : O.none
    )
  )

  const variables = pipe(
    filterdVariables,
    A.map((e) =>
      e.secret ? { key: e.key, secret: e.secret, value: undefined } : e
    )
  )

  const environmentUpdated: Environment = {
    v: 1,
    id: editingID.value ?? "",
    name: editingName.value,
    variables,
  }

  if (props.action === "new") {
    platform.analytics?.logEvent({
      type: "HOPP_CREATE_ENVIRONMENT",
      workspaceType: "team",
    })

    await pipe(
      createTeamEnvironment(
        JSON.stringify(environmentUpdated.variables),
        props.editingTeamId,
        environmentUpdated.name
      ),
      TE.match(
        (err: GQLError<string>) => {
          console.error(err)
          toast.error(`${getErrorMessage(err)}`)
          isLoading.value = false
        },
        (res) => {
          const envID = res.createTeamEnvironment.id
          if (envID) {
            secretEnvironmentService.addSecretEnvironment(
              envID,
              secretVariables
            )
          }
          hideModal()
          toast.success(`${t("environment.created")}`)
          isLoading.value = false
        }
      )
    )()
  } else {
    if (!props.editingEnvironment) {
      console.error("No Environment Found")
      return
    }

    await pipe(
      updateTeamEnvironment(
        JSON.stringify(environmentUpdated.variables),
        props.editingEnvironment.id,
        environmentUpdated.name
      ),
      TE.match(
        (err: GQLError<string>) => {
          console.error(err)
          toast.error(`${getErrorMessage(err)}`)
          isLoading.value = false
        },
        (res) => {
          const envID = res.updateTeamEnvironment.id
          if (envID) {
            secretEnvironmentService.addSecretEnvironment(
              envID,
              secretVariables
            )
          }
          hideModal()
          toast.success(`${t("environment.updated")}`)
          isLoading.value = false
        }
      )
    )()
  }

  isLoading.value = false
}

const hideModal = () => {
  editingName.value = null
  emit("hide-modal")
}

const getErrorMessage = (err: GQLError<string>) => {
  if (err.type === "network_error") {
    return t("error.network_error")
  }
  switch (err.error) {
    case "team_environment/not_found":
      return t("team_environment.not_found")
    default:
      return t("error.something_went_wrong")
  }
}
</script>
