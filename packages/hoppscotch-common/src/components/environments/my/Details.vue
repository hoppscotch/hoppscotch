<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t(`environment.${action}`)"
    @close="hideModal"
  >
    <template #body>
      <div class="flex flex-col">
        <div class="relative flex">
          <input
            id="selectLabelEnvEdit"
            v-model="name"
            v-focus
            class="input floating-input"
            placeholder=" "
            type="text"
            autocomplete="off"
            :disabled="editingEnvironmentIndex === 'Global'"
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
          <div class="flex">
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
              :placeholder="`${t('count.variable', { count: index + 1 })}`"
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
              :label="`${t('add.new')}`"
              filled
              class="mb-4"
              @click="addEnvironmentVariable"
            />
          </HoppSmartPlaceholder>
        </div>
      </div>
    </template>
    <template #footer>
      <span class="flex space-x-2">
        <HoppButtonPrimary
          :label="`${t('action.save')}`"
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
import IconTrash2 from "~icons/lucide/trash-2"
import IconDone from "~icons/lucide/check"
import IconPlus from "~icons/lucide/plus"
import IconTrash from "~icons/lucide/trash"
import { clone } from "lodash-es"
import { computed, ref, watch } from "vue"
import * as E from "fp-ts/Either"
import * as A from "fp-ts/Array"
import * as O from "fp-ts/Option"
import { pipe, flow } from "fp-ts/function"
import { Environment, parseTemplateStringE } from "@hoppscotch/data"
import { refAutoReset } from "@vueuse/core"
import {
  createEnvironment,
  environments$,
  getEnvironment,
  getGlobalVariables,
  globalEnv$,
  setGlobalEnvVariables,
  setSelectedEnvironmentIndex,
  updateEnvironment,
} from "~/newstore/environments"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { useReadonlyStream } from "@composables/stream"
import { useColorMode } from "@composables/theming"
import { environmentsStore } from "~/newstore/environments"

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
    editingEnvironmentIndex?: number | "Global" | null
    editingVariableName?: string | null
    envVars?: () => Environment["variables"]
  }>(),
  {
    show: false,
    action: "edit",
    editingEnvironmentIndex: null,
    editingVariableName: null,
    envVars: () => [],
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

const globalVars = useReadonlyStream(globalEnv$, [])

const workingEnv = computed(() => {
  if (props.editingEnvironmentIndex === "Global") {
    return {
      name: "Global",
      variables: getGlobalVariables(),
    } as Environment
  } else if (props.action === "new") {
    return {
      name: "",
      variables: props.envVars(),
    }
  } else if (props.editingEnvironmentIndex !== null) {
    return getEnvironment({
      type: "MY_ENV",
      index: props.editingEnvironmentIndex,
    })
  } else {
    return null
  }
})

const envList = useReadonlyStream(environments$, []) || props.envVars()

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

  if (props.editingEnvironmentIndex === "Global") {
    return [...vars.value.map((x) => ({ ...x.env, source: name.value! }))]
  } else {
    return [
      ...vars.value.map((x) => ({ ...x.env, source: name.value! })),
      ...globalVars.value.map((x) => ({ ...x, source: "Global" })),
    ]
  }
})

watch(
  () => props.show,
  (show) => {
    if (show) {
      name.value = workingEnv.value?.name ?? null
      vars.value = pipe(
        workingEnv.value?.variables ?? [],
        A.map((e) => ({
          id: idTicker.value++,
          env: clone(e),
        }))
      )
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

const saveEnvironment = () => {
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

  const environmentUpdated: Environment = {
    name: name.value,
    variables: filterdVariables,
  }

  if (props.action === "new") {
    // Creating a new environment
    createEnvironment(name.value, environmentUpdated.variables)
    setSelectedEnvironmentIndex({
      type: "MY_ENV",
      index: envList.value.length - 1,
    })
    toast.success(`${t("environment.created")}`)
  } else if (props.editingEnvironmentIndex === "Global") {
    // Editing the Global environment
    setGlobalEnvVariables(environmentUpdated.variables)
    toast.success(`${t("environment.updated")}`)
  } else if (props.editingEnvironmentIndex !== null) {
    const envID =
      environmentsStore.value.environments[props.editingEnvironmentIndex].id

    // Editing an environment
    updateEnvironment(
      props.editingEnvironmentIndex,
      envID
        ? {
            ...environmentUpdated,
            id: envID,
          }
        : {
            ...environmentUpdated,
          }
    )
    toast.success(`${t("environment.updated")}`)
  }

  hideModal()
}

const hideModal = () => {
  name.value = null
  emit("hide-modal")
}
</script>
