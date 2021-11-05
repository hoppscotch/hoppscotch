import { cloneDeep } from "lodash"
import isEqual from "lodash/isEqual"
import { combineLatest } from "rxjs"
import { distinctUntilChanged, map, pluck } from "rxjs/operators"
import DispatchingStore, {
  defineDispatchers,
} from "~/newstore/DispatchingStore"

export type Environment = {
  name: string
  variables: {
    key: string
    value: string
  }[]
}

const defaultEnvironmentsState = {
  environments: [
    {
      name: "My Environment Variables",
      variables: [],
    },
  ] as Environment[],

  globals: [] as Environment["variables"],

  // Current environment index specifies the index
  // -1 means no environments are selected
  currentEnvironmentIndex: -1,
}

type EnvironmentStore = typeof defaultEnvironmentsState

const dispatchers = defineDispatchers({
  setCurrentEnviromentIndex(
    { environments }: EnvironmentStore,
    { newIndex }: { newIndex: number }
  ) {
    if (newIndex >= environments.length || newIndex <= -2) {
      // console.log(
      //   `Ignoring possibly invalid current environment index assignment (value: ${newIndex})`
      // )
      return {}
    }

    return {
      currentEnvironmentIndex: newIndex,
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
    { name }: { name: string }
  ) {
    return {
      environments: [
        ...environments,
        {
          name,
          variables: [],
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
    const index =
      environments.filter((env) => env.name === newEnvironment.name).length + 1
    return {
      environments: [
        ...environments,
        {
          ...cloneDeep(newEnvironment),
          name: `${newEnvironment.name} ${index}`,
        },
      ],
    }
  },
  deleteEnvironment(
    { environments, currentEnvironmentIndex }: EnvironmentStore,
    { envIndex }: { envIndex: number }
  ) {
    return {
      environments: environments.filter((_, index) => index !== envIndex),
      currentEnvironmentIndex:
        envIndex === currentEnvironmentIndex ? -1 : currentEnvironmentIndex,
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
  clearGlobalVariables() {
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

export const selectedEnvIndex$ = environmentsStore.subject$.pipe(
  pluck("currentEnvironmentIndex"),
  distinctUntilChanged()
)

export const currentEnvironment$ = combineLatest([
  environments$,
  selectedEnvIndex$,
]).pipe(
  map(([envs, selectedIndex]) => {
    if (selectedIndex === -1) {
      const env: Environment = {
        name: "No environment",
        variables: [],
      }

      return env
    } else {
      return envs[selectedIndex]
    }
  })
)

/**
 * Stream returning all the environment variables accessible in
 * the current state (Global + The Selected Environment).
 * NOTE: The source environment attribute will be "Global" for Global Env as source.
 */
export const aggregateEnvs$ = combineLatest([
  currentEnvironment$,
  globalEnv$,
]).pipe(
  map(([selectedEnv, globalVars]) => {
    const results: { key: string; value: string; sourceEnv: string }[] = []

    selectedEnv.variables.forEach(({ key, value }) =>
      results.push({ key, value, sourceEnv: selectedEnv.name })
    )
    globalVars.forEach(({ key, value }) =>
      results.push({ key, value, sourceEnv: "Global" })
    )

    return results
  }),
  distinctUntilChanged(isEqual)
)

export function getCurrentEnvironment(): Environment {
  if (environmentsStore.value.currentEnvironmentIndex === -1) {
    return {
      name: "No environment",
      variables: [],
    }
  }

  return environmentsStore.value.environments[
    environmentsStore.value.currentEnvironmentIndex
  ]
}

export function setCurrentEnvironment(newEnvIndex: number) {
  environmentsStore.dispatch({
    dispatcher: "setCurrentEnviromentIndex",
    payload: {
      newIndex: newEnvIndex,
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

export function createEnvironment(envName: string) {
  environmentsStore.dispatch({
    dispatcher: "createEnvironment",
    payload: {
      name: envName,
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

export function deleteEnvironment(envIndex: number) {
  environmentsStore.dispatch({
    dispatcher: "deleteEnvironment",
    payload: {
      envIndex,
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

export function getEnviroment(index: number) {
  return environmentsStore.value.environments[index]
}
