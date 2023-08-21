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

        <div class="flex items-center justify-between flex-1">
          <label for="variableList" class="p-4">
            {{ t("environment.variable_list") }}
          </label>
          <div v-if="!isViewer" class="flex">
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
        <div
          v-if="evnExpandError"
          class="w-full px-4 py-2 mb-2 overflow-auto font-mono text-red-400 whitespace-normal rounded bg-primaryLight"
        >
          {{ t("environment.nested_overflow") }}
        </div>
        <div class="border rounded divide-y divide-dividerLight border-divider">
          <div
            v-for="({ id, env }, index) in vars"
            :key="`variable-${id}-${index}`"
            class="flex divide-x divide-dividerLight"
          >
            <input
              v-model="env.key"
              v-focus
              class="flex flex-1 px-4 py-2 bg-transparent"
              :class="isViewer && 'opacity-25'"
              :placeholder="`${t('count.variable', { count: index + 1 })}`"
              :name="'param' + index"
              :disabled="isViewer"
            />
            <SmartEnvInput
              v-model="env.value"
              :select-text-on-mount="env.key === editingVariableName"
              :placeholder="`${t('count.value', { count: index + 1 })}`"
              :envs="liveEnvs"
              :name="'value' + index"
              :readonly="isViewer"
            />
            <div v-if="!isViewer" class="flex">
              <HoppButtonSecondary
                id="variable"
                v-tippy="{ theme: 'tooltip' }"
                :title="t('action.remove')"
                :icon="IconTrash"
                color="red"
                @click="removeEnvironmentVariable(index)"
              />
            </div>
          </div>
          <HoppSmartPlaceholder
            v-if="vars.length === 0"
            :src="`/images/states/${colorMode.value}/blockchain.svg`"
            :alt="`${t('empty.environments')}`"
            :text="t('empty.environments')"
          >
            <HoppButtonSecondary
              v-if="isViewer"
              disabled
              :label="`${t('add.new')}`"
              filled
              class="mb-4"
            />
            <HoppButtonSecondary
              v-else
              :label="`${t('add.new')}`"
              filled
              class="mb-4"
              @click="addEnvironmentVariable"
            />
          </HoppSmartPlaceholder>
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
import { platform } from "~/platform"

type EnvironmentVariable = {
  id: number
  env: {
    key: string
    value: string
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
    envVars?: () => Environment["variables"]
  }>(),
  {
    show: false,
    action: "edit",
    editingEnvironment: null,
    editingTeamId: "",
    editingVariableName: null,
    isViewer: false,
    envVars: () => [],
  }
)

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const idTicker = ref(0)

const editingName = ref<string | null>(null)
const vars = ref<EnvironmentVariable[]>([
  { id: idTicker.value++, env: { key: "", value: "" } },
])

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
  } else {
    return [
      ...vars.value.map((x) => ({ ...x.env, source: editingName.value! })),
    ]
  }
})

watch(
  () => props.show,
  (show) => {
    if (show) {
      if (props.action === "new") {
        editingName.value = null
        vars.value = pipe(
          props.envVars() ?? [],
          A.map((e: { key: string; value: string }) => ({
            id: idTicker.value++,
            env: clone(e),
          }))
        )
      } else if (props.editingEnvironment !== null) {
        editingName.value = props.editingEnvironment.environment.name ?? null
        vars.value = pipe(
          props.editingEnvironment.environment.variables ?? [],
          A.map((e: { key: string; value: string }) => ({
            id: idTicker.value++,
            env: clone(e),
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
    },
  })
}

const removeEnvironmentVariable = (index: number) => {
  vars.value.splice(index, 1)
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

  if (props.action === "new") {
    platform.analytics?.logEvent({
      type: "HOPP_CREATE_ENVIRONMENT",
      workspaceType: "team",
    })

    await pipe(
      createTeamEnvironment(
        JSON.stringify(filterdVariables),
        props.editingTeamId,
        editingName.value
      ),
      TE.match(
        (err: GQLError<string>) => {
          console.error(err)
          toast.error(`${getErrorMessage(err)}`)
        },
        () => {
          hideModal()
          toast.success(`${t("environment.created")}`)
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
        JSON.stringify(filterdVariables),
        props.editingEnvironment.id,
        editingName.value
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

  isLoading.value = false
}

const hideModal = () => {
  editingName.value = null
  emit("hide-modal")
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
