<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t(`environment.${action}`)"
    @close="hideModal"
  >
    <template #body>
      <div class="flex flex-col">
        <HoppSmartInput
          v-model="editingName"
          placeholder=" "
          :label="t('action.label')"
          input-styles="floating-input"
          :disabled="editingEnvironmentIndex === 'Global'"
          @submit="saveEnvironment"
        />

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
              :secret="env.secret"
              :is-secret-to-be-toggled="env.secret"
            />
            <div class="flex">
              <HoppSmartCheckbox
                id="variable"
                class="px-2"
                :on="vars[index].env.secret"
                @change="toggleEnvironmentSecret(index)"
              >
                {{ t("action.secret") }}
              </HoppSmartCheckbox>
            </div>
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
import { platform } from "~/platform"

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

const editingName = ref<string | null>(null)
const vars = ref<EnvironmentVariable[]>([
  { id: idTicker.value++, env: { key: "", value: "", secret: false } },
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

const oldEnvironments = ref<Map<number, string>>(new Map())

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
    return [
      ...vars.value.map((x) => ({ ...x.env, source: editingName.value! })),
    ]
  } else {
    return [
      ...vars.value.map((x) => ({ ...x.env, source: editingName.value! })),
      ...globalVars.value.map((x) => ({ ...x, source: "Global" })),
    ]
  }
})

watch(liveEnvs, (newLiveEnvs, oldLiveEnvs) => {
  if (newLiveEnvs.length === oldLiveEnvs.length) {
    for (let i = 0; i < newLiveEnvs.length; i++) {
      const newValue = newLiveEnvs[i].value
      const oldValue = oldLiveEnvs[i].value

      if (newLiveEnvs[i].secret && !oldEnvironments.value.get(i)) {
        oldEnvironments.value.set(i, oldValue)
      } else if (newLiveEnvs[i].secret && oldLiveEnvs[i].secret) {
        oldEnvironments.value.set(i, oldEnvironments.value.get(i) ?? "")
      } else {
        oldEnvironments.value.set(i, newValue)
      }
    }
  }
})

watch(
  () => props.show,
  (show) => {
    if (show) {
      editingName.value = workingEnv.value?.name ?? null
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
      secret: false,
    },
  })
}

const removeEnvironmentVariable = (index: number) => {
  oldEnvironments.value.delete(vars.value[index].id)
  vars.value.splice(index, 1)
}

const toggleEnvironmentSecret = (index: number) => {
  vars.value[index].env.secret = !vars.value[index].env.secret
}

const saveEnvironment = () => {
  if (!editingName.value) {
    toast.error(`${t("environment.invalid_name")}`)
    return
  }

  for (let i = 0; i < vars.value.length; i++) {
    if (vars.value[i]) {
      vars.value[i].env.value = oldEnvironments.value.get(i) ?? ""
    }
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
    name: editingName.value,
    variables: filterdVariables,
  }

  if (props.action === "new") {
    // Creating a new environment
    createEnvironment(editingName.value, environmentUpdated.variables)
    setSelectedEnvironmentIndex({
      type: "MY_ENV",
      index: envList.value.length - 1,
    })
    toast.success(`${t("environment.created")}`)

    platform.analytics?.logEvent({
      type: "HOPP_CREATE_ENVIRONMENT",
      workspaceType: "personal",
    })
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
  editingName.value = null
  emit("hide-modal")
}
</script>
