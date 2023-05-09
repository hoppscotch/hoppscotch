import { Environment } from "@hoppscotch/data"
import { cloneDeep, isEqual } from "lodash-es"
import { combineLatest, Observable } from "rxjs"
import { distinctUntilChanged, map, pluck } from "rxjs/operators"
import DispatchingStore, {
  defineDispatchers,
} from "~/newstore/DispatchingStore"

type SelectedEnvironmentIndex =
  | { type: "NO_ENV_SELECTED" }
  | { type: "MY_ENV"; index: number }
  | {
      type: "TEAM_ENV"
      teamID: string
      teamEnvID: string
      environment: Environment
    }

const defaultEnvironmentsState = {
  environments: [
    {
      name: "My Environment Variables",
      variables: [],
    },
  ] as Environment[],

  // as a temp fix for identifying global env when syncing
  globalEnvID: undefined as string | undefined,
  globals: [] as Environment["variables"],

  selectedEnvironmentIndex: {
    type: "NO_ENV_SELECTED",
  } as SelectedEnvironmentIndex,
}

type EnvironmentStore = typeof defaultEnvironmentsState

const dispatchers = defineDispatchers({
  setSelectedEnvironmentIndex(
    store: EnvironmentStore,
    {
      selectedEnvironmentIndex,
    }: { selectedEnvironmentIndex: SelectedEnvironmentIndex }
  ) {
    if (
      selectedEnvironmentIndex.type === "MY_ENV" &&
      !!store.environments[selectedEnvironmentIndex.index]
    ) {
      return {
        selectedEnvironmentIndex,
      }
    } else {
      return {
        type: "NO_ENV_SELECTED",
      }
    }
  },
  appendEnvironments(
    { environments }: EnvironmentStore,
    { envs }: { envs: Environment[] }
  ) {
    return {
      environments: [...environments, ...envs],
    }
  },
  replaceEnvironments(
    _: EnvironmentStore,
    { environments }: { environments: Environment[] }
  ) {
    return {
      environments,
    }
  },
  createEnvironment(
    { environments }: EnvironmentStore,
    {
      name,
      variables,
      envID,
    }: { name: string; variables: Environment["variables"]; envID?: string }
  ) {
    return {
      environments: [
        ...environments,
        envID
          ? {
              id: envID,
              name,
              variables,
            }
          : {
              name,
              variables,
            },
      ],
    }
  },
  duplicateEnvironment(
    { environments }: EnvironmentStore,
    { envIndex }: { envIndex: number }
  ) {
    const newEnvironment = environments.find((_, index) => index === envIndex)
    if (!newEnvironment) {
      return {
        environments,
      }
    }

    // remove the id, because this is a new environment & it will get its own id when syncing
    delete newEnvironment["id"]

    return {
      environments: [
        ...environments,
        {
          ...cloneDeep(newEnvironment),
          name: `${newEnvironment.name} - Duplicate`,
        },
      ],
    }
  },
  deleteEnvironment(
    {
      environments,
      // currentEnvironmentIndex,
      selectedEnvironmentIndex,
    }: EnvironmentStore,
    // the envID is used in the syncing code, so disabling the lint rule
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    { envIndex, envID }: { envIndex: number; envID?: string }
  ) {
    let newCurrEnvIndex = selectedEnvironmentIndex

    // Scenario 1: Currently Selected Env is removed -> Set currently selected to none
    if (
      selectedEnvironmentIndex.type === "MY_ENV" &&
      envIndex === selectedEnvironmentIndex.index
    )
      newCurrEnvIndex = { type: "NO_ENV_SELECTED" }

    // Scenario 2: Currently Selected Env Index > Deletion Index -> Current Selection Index Shifts One Position to the left -> Correct Env Index by moving back 1 index
    if (
      selectedEnvironmentIndex.type === "MY_ENV" &&
      envIndex < selectedEnvironmentIndex.index
    )
      newCurrEnvIndex = {
        type: "MY_ENV",
        index: selectedEnvironmentIndex.index - 1,
      }

    // Scenario 3: Currently Selected Env Index < Deletion Index -> No change happens at selection position -> Noop
    return {
      environments: environments.filter((_, index) => index !== envIndex),
      selectedEnvironmentIndex: newCurrEnvIndex,
    }
  },
  renameEnvironment(
    { environments }: EnvironmentStore,
    { envIndex, newName }: { envIndex: number; newName: string }
  ) {
    return {
      environments: environments.map((env, index) =>
        index === envIndex
          ? {
              ...env,
              name: newName,
            }
          : env
      ),
    }
  },
  updateEnvironment(
    { environments }: EnvironmentStore,
    { envIndex, updatedEnv }: { envIndex: number; updatedEnv: Environment }
  ) {
    return {
      environments: environments.map((env, index) =>
        index === envIndex ? updatedEnv : env
      ),
    }
  },
  addEnvironmentVariable(
    { environments }: EnvironmentStore,
    { envIndex, key, value }: { envIndex: number; key: string; value: string }
  ) {
    return {
      environments: environments.map((env, index) =>
        index === envIndex
          ? {
              ...env,
              variables: [...env.variables, { key, value }],
            }
          : env
      ),
    }
  },
  removeEnvironmentVariable(
    { environments }: EnvironmentStore,
    { envIndex, variableIndex }: { envIndex: number; variableIndex: number }
  ) {
    return {
      environments: environments.map((env, index) =>
        index === envIndex
          ? {
              ...env,
              variables: env.variables.filter(
                (_, vIndex) => vIndex !== variableIndex
              ),
            }
          : env
      ),
    }
  },
  setEnvironmentVariables(
    { environments }: EnvironmentStore,
    {
      envIndex,
      vars,
    }: { envIndex: number; vars: { key: string; value: string }[] }
  ) {
    return {
      environments: environments.map((env, index) =>
        index === envIndex
          ? {
              ...env,
              variables: vars,
            }
          : env
      ),
    }
  },
  updateEnvironmentVariable(
    { environments }: EnvironmentStore,
    {
      envIndex,
      variableIndex,
      updatedKey,
      updatedValue,
    }: {
      envIndex: number
      variableIndex: number
      updatedKey: string
      updatedValue: string
    }
  ) {
    return {
      environments: environments.map((env, index) =>
        index === envIndex
          ? {
              ...env,
              variables: env.variables.map((v, vIndex) =>
                vIndex === variableIndex
                  ? { key: updatedKey, value: updatedValue }
                  : v
              ),
            }
          : env
      ),
    }
  },
  setGlobalVariables(_, { entries }: { entries: Environment["variables"] }) {
    return {
      globals: entries,
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  clearGlobalVariables(_store, {}) {
    return {
      globals: [],
    }
  },
  addGlobalVariable(
    { globals },
    { entry }: { entry: Environment["variables"][number] }
  ) {
    return {
      globals: [...globals, entry],
    }
  },
  removeGlobalVariable({ globals }, { envIndex }: { envIndex: number }) {
    return {
      globals: globals.filter((_, i) => i !== envIndex),
    }
  },
  updateGlobalVariable(
    { globals },
    {
      envIndex,
      updatedEntry,
    }: { envIndex: number; updatedEntry: Environment["variables"][number] }
  ) {
    return {
      globals: globals.map((x, i) => (i !== envIndex ? x : updatedEntry)),
    }
  },
  setGlobalEnvID(_, { id }: { id: string }) {
    return {
      globalEnvID: id,
    }
  },
  // only used for environments.sync.ts to prevent double insertion of environments from storeSync and Subscriptions
  removeDuplicateEntry({ environments }, { id }: { id: string }) {
    const entries = environments.filter((e) => e.id === id)

    const newEnvironments = [...environments]

    if (entries.length == 2) {
      const indexToRemove = environments.findIndex((e) => e.id === id)
      newEnvironments.splice(indexToRemove, 1)
    }
    return {
      environments: newEnvironments,
    }
  },
})

export const environmentsStore = new DispatchingStore(
  defaultEnvironmentsState,
  dispatchers
)

export const environments$ = environmentsStore.subject$.pipe(
  pluck("environments"),
  distinctUntilChanged()
)

export const globalEnv$ = environmentsStore.subject$.pipe(
  pluck("globals"),
  distinctUntilChanged()
)

export const selectedEnvironmentIndex$ = environmentsStore.subject$.pipe(
  pluck("selectedEnvironmentIndex"),
  distinctUntilChanged()
)

export const currentEnvironment$: Observable<Environment | undefined> =
  environmentsStore.subject$.pipe(
    map(({ environments, selectedEnvironmentIndex }) => {
      if (selectedEnvironmentIndex.type === "NO_ENV_SELECTED") {
        const env: Environment = {
          name: "No environment",
          variables: [],
        }
        return env
      } else if (selectedEnvironmentIndex.type === "MY_ENV") {
        return environments[selectedEnvironmentIndex.index]
      } else {
        return selectedEnvironmentIndex.environment
      }
    })
  )

export type AggregateEnvironment = {
  key: string
  value: string
  sourceEnv: string
}

/**
 * Stream returning all the environment variables accessible in
 * the current state (Global + The Selected Environment).
 * NOTE: The source environment attribute will be "Global" for Global Env as source.
 */
export const aggregateEnvs$: Observable<AggregateEnvironment[]> = combineLatest(
  [currentEnvironment$, globalEnv$]
).pipe(
  map(([selectedEnv, globalVars]) => {
    const results: AggregateEnvironment[] = []

    selectedEnv?.variables.forEach(({ key, value }) =>
      results.push({ key, value, sourceEnv: selectedEnv.name })
    )
    globalVars.forEach(({ key, value }) =>
      results.push({ key, value, sourceEnv: "Global" })
    )

    return results
  }),
  distinctUntilChanged(isEqual)
)

export function getAggregateEnvs() {
  const currentEnv = getCurrentEnvironment()

  return [
    ...currentEnv.variables.map(
      (x) =>
        <AggregateEnvironment>{
          key: x.key,
          value: x.value,
          sourceEnv: currentEnv.name,
        }
    ),
    ...getGlobalVariables().map(
      (x) =>
        <AggregateEnvironment>{
          key: x.key,
          value: x.value,
          sourceEnv: "Global",
        }
    ),
  ]
}

export function getCurrentEnvironment(): Environment {
  if (
    environmentsStore.value.selectedEnvironmentIndex.type === "NO_ENV_SELECTED"
  ) {
    return {
      name: "No environment",
      variables: [],
    }
  } else if (
    environmentsStore.value.selectedEnvironmentIndex.type === "MY_ENV"
  ) {
    return environmentsStore.value.environments[
      environmentsStore.value.selectedEnvironmentIndex.index
    ]
  } else {
    return environmentsStore.value.selectedEnvironmentIndex.environment
  }
}

export function getSelectedEnvironmentType() {
  return environmentsStore.value.selectedEnvironmentIndex.type
}

export function setSelectedEnvironmentIndex(
  selectedEnvironmentIndex: SelectedEnvironmentIndex
) {
  environmentsStore.dispatch({
    dispatcher: "setSelectedEnvironmentIndex",
    payload: {
      selectedEnvironmentIndex,
    },
  })
}

export function getLegacyGlobalEnvironment(): Environment | null {
  const envs = environmentsStore.value.environments

  const el = envs.find(
    (env) => env.name === "globals" || env.name === "Globals"
  )

  return el ?? null
}

export function getGlobalVariables(): Environment["variables"] {
  return environmentsStore.value.globals
}

export function getGlobalVariableID() {
  return environmentsStore.value.globalEnvID
}

export function getLocalIndexByEnvironmentID(id: string) {
  const envIndex = environmentsStore.value.environments.findIndex(
    (env) => env.id === id
  )

  return envIndex != -1 ? envIndex : null
}

export function addGlobalEnvVariable(entry: Environment["variables"][number]) {
  environmentsStore.dispatch({
    dispatcher: "addGlobalVariable",
    payload: {
      entry,
    },
  })
}

export function setGlobalEnvVariables(entries: Environment["variables"]) {
  environmentsStore.dispatch({
    dispatcher: "setGlobalVariables",
    payload: {
      entries,
    },
  })
}

export function clearGlobalEnvVariables() {
  environmentsStore.dispatch({
    dispatcher: "clearGlobalVariables",
    payload: {},
  })
}

export function removeGlobalEnvVariable(envIndex: number) {
  environmentsStore.dispatch({
    dispatcher: "removeGlobalVariable",
    payload: {
      envIndex,
    },
  })
}

export function updateGlobalEnvVariable(
  envIndex: number,
  updatedEntry: Environment["variables"][number]
) {
  environmentsStore.dispatch({
    dispatcher: "updateGlobalVariable",
    payload: {
      envIndex,
      updatedEntry,
    },
  })
}

export function replaceEnvironments(newEnvironments: any[]) {
  environmentsStore.dispatch({
    dispatcher: "replaceEnvironments",
    payload: {
      environments: newEnvironments,
    },
  })
}

export function appendEnvironments(envs: Environment[]) {
  environmentsStore.dispatch({
    dispatcher: "appendEnvironments",
    payload: {
      envs,
    },
  })
}

export function createEnvironment(
  envName: string,
  variables?: Environment["variables"],
  envID?: string
) {
  environmentsStore.dispatch({
    dispatcher: "createEnvironment",
    payload: {
      name: envName,
      variables: variables ?? [],
      envID,
    },
  })
}

export function duplicateEnvironment(envIndex: number) {
  environmentsStore.dispatch({
    dispatcher: "duplicateEnvironment",
    payload: {
      envIndex,
    },
  })
}

export function deleteEnvironment(envIndex: number, envID?: string) {
  environmentsStore.dispatch({
    dispatcher: "deleteEnvironment",
    payload: {
      envIndex,
      envID,
    },
  })
}

export function renameEnvironment(envIndex: number, newName: string) {
  environmentsStore.dispatch({
    dispatcher: "renameEnvironment",
    payload: {
      envIndex,
      newName,
    },
  })
}

export function updateEnvironment(envIndex: number, updatedEnv: Environment) {
  environmentsStore.dispatch({
    dispatcher: "updateEnvironment",
    payload: {
      envIndex,
      updatedEnv,
    },
  })
}

export function setEnvironmentVariables(
  envIndex: number,
  vars: { key: string; value: string }[]
) {
  environmentsStore.dispatch({
    dispatcher: "setEnvironmentVariables",
    payload: {
      envIndex,
      vars,
    },
  })
}

export function addEnvironmentVariable(
  envIndex: number,
  { key, value }: { key: string; value: string }
) {
  environmentsStore.dispatch({
    dispatcher: "addEnvironmentVariable",
    payload: {
      envIndex,
      key,
      value,
    },
  })
}

export function removeEnvironmentVariable(
  envIndex: number,
  variableIndex: number
) {
  environmentsStore.dispatch({
    dispatcher: "removeEnvironmentVariable",
    payload: {
      envIndex,
      variableIndex,
    },
  })
}

export function updateEnvironmentVariable(
  envIndex: number,
  variableIndex: number,
  { key, value }: { key: string; value: string }
) {
  environmentsStore.dispatch({
    dispatcher: "updateEnvironmentVariable",
    payload: {
      envIndex,
      variableIndex,
      updatedKey: key,
      updatedValue: value,
    },
  })
}

export function setGlobalEnvID(id: string) {
  environmentsStore.dispatch({
    dispatcher: "setGlobalEnvID",
    payload: {
      id,
    },
  })
}

export function removeDuplicateEntry(id: string) {
  environmentsStore.dispatch({
    dispatcher: "removeDuplicateEntry",
    payload: {
      id,
    },
  })
}

type SelectedEnv =
  | { type: "NO_ENV_SELECTED" }
  | { type: "MY_ENV"; index: number }
  | { type: "TEAM_ENV" }

export function getEnvironment(selectedEnv: SelectedEnv) {
  if (selectedEnv.type === "MY_ENV") {
    return environmentsStore.value.environments[selectedEnv.index]
  } else if (
    selectedEnv.type === "TEAM_ENV" &&
    environmentsStore.value.selectedEnvironmentIndex.type === "TEAM_ENV"
  ) {
    return environmentsStore.value.selectedEnvironmentIndex.environment
  } else {
    return {
      name: "N0_ENV",
      variables: [],
    }
  }
}
