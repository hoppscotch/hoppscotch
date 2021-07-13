import { combineLatest } from "rxjs"
import { map, pluck } from "rxjs/operators"
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
      console.log(
        `Ignoring possibly invalid current environment index assignment (value: ${newIndex})`
      )

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
})

export const environmentsStore = new DispatchingStore(
  defaultEnvironmentsState,
  dispatchers
)

export const environments$ = environmentsStore.subject$.pipe(
  pluck("environments")
)

export const selectedEnvIndex$ = environmentsStore.subject$.pipe(
  pluck("currentEnvironmentIndex")
)

export const currentEnvironment$ = combineLatest([
  environments$,
  selectedEnvIndex$,
]).pipe(
  map(([envs, selectedIndex]) => {
    if (selectedIndex === -1) {
      const env: Environment = {
        name: "No Environment",
        variables: [],
      }

      return env
    } else {
      return envs[selectedIndex]
    }
  })
)

export function getCurrentEnvironment(): Environment {
  if (environmentsStore.value.currentEnvironmentIndex === -1) {
    return {
      name: "No Environment",
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

export function getGlobalEnvironment(): Environment | null {
  const envs = environmentsStore.value.environments

  const el = envs.find(
    (env) => env.name === "globals" || env.name === "Globals"
  )

  return el ?? null
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
