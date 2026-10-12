import { ref } from "vue"
import { GlobalEnvironmentVariable } from "@hoppscotch/data"

export const temporaryVariables = ref<GlobalEnvironmentVariable[]>([])

export function getTemporaryVariables() {
  return temporaryVariables.value
}

export function setTemporaryVariables(variables: GlobalEnvironmentVariable[]) {
  temporaryVariables.value = variables
}

export function clearTemporaryVariables() {
  temporaryVariables.value = []
}

export function addTemporaryVariable(variable: GlobalEnvironmentVariable) {
  temporaryVariables.value.push(variable)
}

/**
 * Shapes post-script env changes for the temporary-variable store
 * (keepVariableValues = false runs).
 *
 * Selected must precede global: the temp scope outranks both real scopes and
 * is deduped first-occurrence-wins, so this order keeps a key present in both
 * scopes resolving to its selected value on every request of a run.
 */
export function scriptEnvsToTemporaryVariables(envs: {
  global: GlobalEnvironmentVariable[]
  selected: GlobalEnvironmentVariable[]
}): GlobalEnvironmentVariable[] {
  return [...envs.selected, ...envs.global]
}
