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
          :value="draftKeys[row.varIndex] ?? row.key"
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
import * as E from "fp-ts/Either"
import { cloneDeep } from "lodash-es"
import { computed, ref, watch } from "vue"
import { useI18n } from "~/composables/i18n"
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

  // Both value services drop entries with an empty key, so a value typed for a
  // keyless variable would be erased on the next tick. Ignore it until the
  // variable has a key.
  if (!row.key) return

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

// Pending key edits, merged into every payload so a quick second rename cannot
// overwrite the first before the definition echoes it back.
const draftKeys = ref<Record<number, string>>({})

const variablesWithDraftKeys = (env: Environment) =>
  env.variables.map((variable, index) => ({
    ...variable,
    key: draftKeys.value[index] ?? variable.key,
  }))

// Drop drafts once the definition reflects them; reset when the target changes.
watch(targetEnv, (env) => {
  if (!env) {
    draftKeys.value = {}
    return
  }

  const remaining: Record<number, string> = {}
  for (const [index, key] of Object.entries(draftKeys.value)) {
    const varIndex = Number(index)
    if (env.variables[varIndex]?.key !== key) remaining[varIndex] = key
  }
  draftKeys.value = remaining
})

watch(
  () => props.target,
  () => {
    draftKeys.value = {}
  }
)

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

// Serialize team writes so a second rename cannot build its payload from a
// stale snapshot and overwrite the first.
let teamKeySaveQueue: Promise<void> = Promise.resolve()

const queueTeamKeySave = (
  varIndex: number,
  newKey: string,
  isSecret: boolean
) => {
  teamKeySaveQueue = teamKeySaveQueue.then(async () => {
    const env = targetEnv.value
    const teamEnvID =
      props.target.type === "team-environment" ? props.target.id : null
    if (!env || !teamEnvID) return

    const variablesForWire = stripClientLocalValuesForWire(
      variablesWithDraftKeys(env)
    )

    const result = await updateTeamEnvironment(
      JSON.stringify(variablesForWire),
      teamEnvID,
      envName.value
    )()

    if (E.isLeft(result)) {
      console.error(result.left)
      toast.error(t(getEnvActionErrorMessage(result.left)))

      // Only drop the draft this request failed to save. A newer rename may
      // have replaced it while the request was in flight, and that one should
      // still be sent by the next queued save.
      if (draftKeys.value[varIndex] === newKey) {
        const remaining = { ...draftKeys.value }
        delete remaining[varIndex]
        draftKeys.value = remaining
      }
      return
    }

    setVariableKeyInServices(teamEnvID, varIndex, newKey, isSecret)
  })
}

const persistKey = (varIndex: number, newKey: string) => {
  const env = targetEnv.value
  if (!env) return

  const isSecret = env.variables[varIndex]?.secret ?? false
  draftKeys.value = { ...draftKeys.value, [varIndex]: newKey }

  if (props.target.type === "team-environment") {
    queueTeamKeySave(varIndex, newKey, isSecret)
    return
  }

  // Keep client-local values out of the stored definition, as the modal does.
  const variablesForWire = stripClientLocalValuesForWire(
    variablesWithDraftKeys(env)
  )

  if (props.target.type === "my-environment") {
    updateEnvironment(props.target.index, {
      ...cloneDeep(env),
      variables: variablesForWire,
    })
  } else {
    setGlobalEnvVariables({
      v: 2,
      variables: variablesForWire,
    } as GlobalEnvironment)
  }

  setVariableKeyInServices(envID.value, varIndex, newKey, isSecret)
}

const commitKey = (row: Row, event: Event) => {
  const input = event.target as HTMLInputElement
  const newKey = input.value.trim()
  const displayedKey = draftKeys.value[row.varIndex] ?? row.key

  if (props.keysReadonly || newKey === displayedKey) return

  // Empty keys are dropped by the modal's save; revert to the persisted key.
  if (!newKey) {
    const remaining = { ...draftKeys.value }
    delete remaining[row.varIndex]
    draftKeys.value = remaining
    input.value = row.key
    return
  }

  persistKey(row.varIndex, newKey)
}
</script>
