<template>
  <SmartModal
    v-if="show"
    dialog
    :title="t(`environment.${action}`)"
    @close="hideModal"
  >
    <template #body>
      <div class="flex flex-col px-2">
        <div class="relative flex">
          <input
            id="selectLabelEnvEdit"
            v-model="name"
            v-focus
            class="input floating-input"
            :class="isViewer && 'opacity-25'"
            placeholder=""
            type="text"
            autocomplete="off"
            :disabled="isViewer"
            @keyup.enter="saveEnvironment"
          />
          <label for="selectLabelEnvEdit">
            {{ t("action.label") }}
          </label>
        </div>
        <div class="flex items-center justify-between flex-1">
          <label for="variableList" class="p-4">
            {{ t("environment.variable_list") }}
          </label>
          <div v-if="!isViewer" class="flex">
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('action.clear_all')"
              :icon="clearIcon"
              @click="clearContent()"
            />
            <ButtonSecondary
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
              <ButtonSecondary
                id="variable"
                v-tippy="{ theme: 'tooltip' }"
                :title="t('action.remove')"
                :icon="IconTrash"
                color="red"
                @click="removeEnvironmentVariable(index)"
              />
            </div>
          </div>
          <div
            v-if="vars.length === 0"
            class="flex flex-col items-center justify-center p-4 text-secondaryLight"
          >
            <img
              :src="`/images/states/${colorMode.value}/blockchain.svg`"
              loading="lazy"
              class="inline-flex flex-col object-contain object-center w-16 h-16 my-4"
              :alt="`${t('empty.environments')}`"
            />
            <span class="pb-4 text-center">
              {{ t("empty.environments") }}
            </span>
            <ButtonSecondary
              v-if="isViewer"
              disabled
              :label="`${t('add.new')}`"
              filled
              class="mb-4"
            />
            <ButtonSecondary
              v-else
              :label="`${t('add.new')}`"
              filled
              class="mb-4"
              @click="addEnvironmentVariable"
            />
          </div>
        </div>
      </div>
    </template>
    <template v-if="!isViewer" #footer>
      <span class="flex space-x-2">
        <ButtonPrimary
          :label="`${t('action.save')}`"
          :loading="isLoading"
          outline
          @click="saveEnvironment"
        />
        <ButtonSecondary
          :label="`${t('action.cancel')}`"
          outline
          filled
          @click="hideModal"
        />
      </span>
    </template>
  </SmartModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"
import * as E from "fp-ts/Either"
import * as A from "fp-ts/Array"
import * as O from "fp-ts/Option"
import * as TE from "fp-ts/TaskEither"
import { flow, pipe } from "fp-ts/function"
import { parseTemplateStringE } from "@hoppscotch/data"
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
    editingEnvironment: TeamEnvironment | null
    editingTeamId: string | undefined
    editingVariableName: string | null
    isViewer: boolean
  }>(),
  {
    show: false,
    action: "edit",
    editingEnvironment: null,
    editingTeamId: "",
  }
)

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const idTicker = ref(0)

const name = ref<string | null>(null)
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
    return [...vars.value.map((x) => ({ ...x.env, source: name.value! }))]
  }
})

watch(
  () => props.show,
  (show) => {
    if (show) {
      if (props.editingEnvironment === null) {
        name.value = null
        vars.value = []
      } else {
        name.value = props.editingEnvironment.environment.name ?? null
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

  if (!name.value) {
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
    await pipe(
      createTeamEnvironment(
        JSON.stringify(filterdVariables),
        props.editingTeamId,
        name.value
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
        name.value
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
  name.value = null
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
