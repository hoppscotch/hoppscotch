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
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('action.clear_all')"
              :svg="clearIcon"
              @click.native="clearContent()"
            />
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              svg="plus"
              :title="t('add.new')"
              @click.native="addEnvironmentVariable"
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
            v-for="(variable, index) in vars"
            :key="`variable-${index}`"
            class="flex divide-x divide-dividerLight"
          >
            <input
              v-model="variable.key"
              class="flex flex-1 px-4 py-2 bg-transparent"
              :placeholder="`${t('count.variable', { count: index + 1 })}`"
              :name="'param' + index"
            />
            <SmartEnvInput
              v-model="variable.value"
              :placeholder="`${t('count.value', { count: index + 1 })}`"
              :envs="liveEnvs"
              :name="'value' + index"
            />
            <div class="flex">
              <ButtonSecondary
                id="variable"
                v-tippy="{ theme: 'tooltip' }"
                :title="t('action.remove')"
                svg="trash"
                color="red"
                @click.native="removeEnvironmentVariable(index)"
              />
            </div>
          </div>
          <div
            v-if="vars.length === 0"
            class="flex flex-col items-center justify-center p-4 text-secondaryLight"
          >
            <img
              :src="`/images/states/${$colorMode.value}/blockchain.svg`"
              loading="lazy"
              class="inline-flex flex-col object-contain object-center w-16 h-16 my-4"
              :alt="`${t('empty.environments')}`"
            />
            <span class="pb-4 text-center">
              {{ t("empty.environments") }}
            </span>
            <ButtonSecondary
              :label="`${t('add.new')}`"
              filled
              class="mb-4"
              @click.native="addEnvironmentVariable"
            />
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <span>
        <ButtonPrimary
          :label="`${t('action.save')}`"
          @click.native="saveEnvironment"
        />
        <ButtonSecondary
          :label="`${t('action.cancel')}`"
          @click.native="hideModal"
        />
      </span>
    </template>
  </SmartModal>
</template>

<script setup lang="ts">
import clone from "lodash/clone"
import { computed, ref, watch } from "@nuxtjs/composition-api"
import * as E from "fp-ts/Either"
import { Environment, parseTemplateStringE } from "@hoppscotch/data"
import {
  createEnvironment,
  environments$,
  getEnviroment,
  getGlobalVariables,
  globalEnv$,
  setCurrentEnvironment,
  setGlobalEnvVariables,
  updateEnvironment,
} from "~/newstore/environments"
import {
  useReadonlyStream,
  useI18n,
  useToast,
} from "~/helpers/utils/composables"

const t = useI18n()
const toast = useToast()

const props = withDefaults(
  defineProps<{
    show: boolean
    action: "edit" | "new"
    editingEnvironmentIndex: number | "Global" | null
    envVars: () => Environment["variables"]
  }>(),
  {
    show: false,
    action: "edit",
    editingEnvironmentIndex: null,
    envVars: () => [],
  }
)

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const name = ref<string | null>(null)
const vars = ref([{ key: "", value: "" }])
const clearIcon = ref("trash-2")

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
    return getEnviroment(props.editingEnvironmentIndex)
  } else {
    return null
  }
})

const envList = useReadonlyStream(environments$, []) || props.envVars()

const evnExpandError = computed(() => {
  for (const variable of vars.value) {
    const result = parseTemplateStringE(variable.value.toString(), vars.value)

    if (E.isLeft(result)) {
      console.error("error", result.left)
      return true
    }
  }
  return false
})

const liveEnvs = computed(() => {
  if (evnExpandError) {
    return []
  }

  if (props.editingEnvironmentIndex === "Global") {
    return [...vars.value.map((x) => ({ ...x, source: name.value! }))]
  } else {
    return [
      ...vars.value.map((x) => ({ ...x, source: name.value! })),
      ...globalVars.value.map((x) => ({ ...x, source: "Global" })),
    ]
  }
})

watch(
  () => props.show,
  (show) => {
    if (show) {
      name.value = workingEnv.value?.name ?? null
      vars.value = clone(workingEnv.value?.variables ?? [])
    }
  }
)

const clearContent = () => {
  vars.value = []
  clearIcon.value = "check"
  toast.success(`${t("state.cleared")}`)
  setTimeout(() => (clearIcon.value = "trash-2"), 1000)
}

const addEnvironmentVariable = () => {
  vars.value.push({
    key: "",
    value: "",
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

  if (props.action === "new") {
    createEnvironment(name.value)
    setCurrentEnvironment(envList.value.length - 1)
  }

  const environmentUpdated: Environment = {
    name: name.value,
    variables: vars.value,
  }

  if (props.editingEnvironmentIndex === null) return
  if (props.editingEnvironmentIndex === "Global")
    setGlobalEnvVariables(environmentUpdated.variables)
  else if (props.action === "new") {
    updateEnvironment(envList.value.length - 1, environmentUpdated)
  } else {
    updateEnvironment(props.editingEnvironmentIndex!, environmentUpdated)
  }
  hideModal()
}

const hideModal = () => {
  name.value = null
  emit("hide-modal")
}
</script>
