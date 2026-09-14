<template>
  <div class="flex flex-col">
    <div
      class="sticky top-0 z-10 flex flex-shrink-0 items-center gap-1 border-b border-dividerLight bg-primary px-2 py-1"
    >
      <HoppButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        :title="t('action.back')"
        :icon="IconArrowLeft"
        class="!px-1"
        @click="emit('close')"
      />
      <span class="min-w-0 flex-1 truncate font-semibold text-secondaryDark">
        {{ envName }}
      </span>
    </div>

    <div
      v-if="rows.length === 0"
      class="px-4 py-6 text-center text-secondaryLight"
    >
      {{ t("environment.empty_variables") }}
    </div>

    <div v-else class="flex flex-col">
      <div
        v-for="row in rows"
        :key="row.varIndex"
        class="grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)_auto] items-center gap-1 border-b border-dividerLight px-2 py-1"
      >
        <input
          :value="row.key"
          class="min-w-0 truncate rounded bg-transparent px-1 py-1 text-secondaryDark focus:outline-none focus:ring-1 focus:ring-dividerDark"
          :class="{ 'opacity-50': keysReadonly }"
          :placeholder="t('count.variable', { count: row.varIndex + 1 })"
          :aria-label="t('count.variable', { count: row.varIndex + 1 })"
          :disabled="keysReadonly"
          @blur="commitKey(row, $event)"
          @keydown.enter.prevent="blurTarget($event)"
        />
        <input
          :value="row.value"
          :type="
            row.secret && !isSecretRevealed(row.varIndex) ? 'password' : 'text'
          "
          class="min-w-0 truncate rounded bg-transparent px-1 py-1 text-secondaryLight focus:outline-none focus:ring-1 focus:ring-dividerDark"
          :placeholder="t('count.currentValue', { count: row.varIndex + 1 })"
          :aria-label="valueAriaLabel(row)"
          @input="commitValue(row, $event)"
          @keydown.enter.prevent="blurTarget($event)"
        />
        <HoppButtonSecondary
          v-if="row.secret"
          v-tippy="{ theme: 'tooltip' }"
          :title="
            isSecretRevealed(row.varIndex)
              ? t('action.hide_secret')
              : t('action.show_secret')
          "
          :icon="isSecretRevealed(row.varIndex) ? IconEyeOff : IconEye"
          class="!px-1"
          @click="toggleSecretReveal(row.varIndex)"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
export type EnvironmentEditorTarget =
  | { type: "global" }
  | { type: "my-environment"; index: number }
  | { type: "team-environment"; id: string }
</script>

<script setup lang="ts">
import { Environment, GlobalEnvironment } from "@hoppscotch/data"
import { useReadonlyStream } from "@composables/stream"
import { useToast } from "@composables/toast"
import { useService } from "dioc/vue"
import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import { cloneDeep } from "lodash-es"
import { computed, ref } from "vue"
import { useI18n } from "~/composables/i18n"
import { GQLError } from "~/helpers/backend/GQLClient"
import { updateTeamEnvironment } from "~/helpers/backend/mutations/TeamEnvironment"
import { stripClientLocalValuesForWire } from "~/helpers/clientLocalVariables"
import { getEnvActionErrorMessage } from "~/helpers/error-messages"
import { TeamEnvironment } from "~/helpers/teams/TeamEnvironment"
import {
  environments$,
  globalEnv$,
  setGlobalEnvVariables,
  updateEnvironment,
} from "~/newstore/environments"
import { CurrentValueService } from "~/services/current-environment-value.service"
import { SecretEnvironmentService } from "~/services/secret-environment.service"
import IconArrowLeft from "~icons/lucide/arrow-left"
import IconEye from "~icons/lucide/eye"
import IconEyeOff from "~icons/lucide/eye-off"

const props = withDefaults(
  defineProps<{
    target: EnvironmentEditorTarget
    teamEnvironments?: TeamEnvironment[]
    /**
     * Locks the variable keys (the shared definition) — set for team viewers,
     * who may not write the team environment. Current values stay editable
     * because they are stored locally per user and never synced.
     */
    keysReadonly?: boolean
  }>(),
  {
    teamEnvironments: () => [],
    keysReadonly: false,
  }
)

const emit = defineEmits<{
  (e: "close"): void
}>()

const t = useI18n()
const toast = useToast()

const currentEnvironmentValueService = useService(CurrentValueService)
const secretEnvironmentService = useService(SecretEnvironmentService)

const myEnvironments = useReadonlyStream(environments$, [])

const globalEnv = useReadonlyStream(globalEnv$, {
  v: 2,
  variables: [],
} as GlobalEnvironment)

const targetEnv = computed<Environment | null>(() => {
  if (props.target.type === "global") {
    return {
      v: 2,
      id: "Global",
      name: "Global",
      variables: globalEnv.value.variables,
    } as Environment
  }

  if (props.target.type === "my-environment") {
    return myEnvironments.value[props.target.index] ?? null
  }

  return (
    props.teamEnvironments.find((env) => env.id === props.target.id)
      ?.environment ?? null
  )
})

const envID = computed(() => {
  if (props.target.type === "global") return "Global"
  if (props.target.type === "my-environment") return targetEnv.value?.id ?? ""
  return props.target.id
})

const envName = computed(() => targetEnv.value?.name ?? "")

type Row = {
  varIndex: number
  key: string
  value: string
  secret: boolean
}

const rows = computed<Row[]>(() => {
  const env = targetEnv.value
  if (!env) return []

  return env.variables.map((variable, varIndex) => ({
    varIndex,
    key: variable.key,
    secret: variable.secret,
    value: variable.secret
      ? (secretEnvironmentService.getSecretEnvironmentVariableValue(
          envID.value,
          varIndex
        )?.value ?? "")
      : (currentEnvironmentValueService.getEnvironmentVariableValue(
          envID.value,
          varIndex
        ) ??
        variable.currentValue ??
        ""),
  }))
})

const blurTarget = (event: Event) => {
  ;(event.target as HTMLInputElement).blur()
}

// Row-specific accessible names: several rows render the same control, so the
// label has to carry the variable it belongs to.
const valueAriaLabel = (row: Row) =>
  row.key
    ? `${t("environment.current_value")}: ${row.key}`
    : t("count.currentValue", { count: row.varIndex + 1 })

// Secret values are local to this device, but stay masked until revealed.
const revealedSecrets = ref<Record<number, boolean>>({})

const isSecretRevealed = (varIndex: number) =>
  Boolean(revealedSecrets.value[varIndex])

const toggleSecretReveal = (varIndex: number) => {
  revealedSecrets.value = {
    ...revealedSecrets.value,
    [varIndex]: !revealedSecrets.value[varIndex],
  }
}

const commitValue = (row: Row, event: Event) => {
  const value = (event.target as HTMLInputElement).value

  if (row.secret) {
    secretEnvironmentService.setSecretEnvironmentVariableValue(
      envID.value,
      row.varIndex,
      value,
      row.key
    )
    return
  }

  currentEnvironmentValueService.setEnvironmentVariableValue(
    envID.value,
    row.varIndex,
    value,
    row.key
  )
}

const setVariableKeyInServices = (
  id: string,
  varIndex: number,
  newKey: string,
  isSecret: boolean
) => {
  if (isSecret) {
    secretEnvironmentService.setSecretEnvironmentVariableKey(
      id,
      varIndex,
      newKey
    )
  } else {
    currentEnvironmentValueService.setEnvironmentVariableKey(
      id,
      varIndex,
      newKey
    )
  }
}

const persistKey = (varIndex: number, newKey: string) => {
  const env = targetEnv.value
  if (!env) return

  const isSecret = env.variables[varIndex]?.secret ?? false

  const updatedVariables = env.variables.map((variable, index) =>
    index === varIndex ? { ...variable, key: newKey } : variable
  )

  if (props.target.type === "my-environment") {
    updateEnvironment(props.target.index, {
      ...cloneDeep(env),
      variables: updatedVariables,
    })
  } else if (props.target.type === "global") {
    setGlobalEnvVariables({
      v: 2,
      variables: updatedVariables,
    } as GlobalEnvironment)
  } else {
    const teamEnvID = props.target.id
    const teamEnvName = envName.value
    pipe(
      updateTeamEnvironment(
        JSON.stringify(stripClientLocalValuesForWire(updatedVariables)),
        teamEnvID,
        teamEnvName
      ),
      TE.match(
        (err: GQLError<string>) => {
          console.error(err)
          toast.error(t(getEnvActionErrorMessage(err)))
        },
        () => {
          setVariableKeyInServices(teamEnvID, varIndex, newKey, isSecret)
        }
      )
    )()
    return
  }

  setVariableKeyInServices(envID.value, varIndex, newKey, isSecret)
}

const commitKey = (row: Row, event: Event) => {
  const input = event.target as HTMLInputElement
  const newKey = input.value.trim()

  if (props.keysReadonly || newKey === row.key) return

  // Empty keys are dropped by the environment modal's save; revert instead of
  // persisting a nameless variable.
  if (!newKey) {
    input.value = row.key
    return
  }

  persistKey(row.varIndex, newKey)
}
</script>
