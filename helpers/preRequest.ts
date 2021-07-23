import {
  getCurrentEnvironment,
  getGlobalEnvironment,
} from "~/newstore/environments"

export default function getEnvironmentVariablesFromScript(script: string) {
  const _variables: Record<string, string> = {}

  const currentEnv = getCurrentEnvironment()

  for (const variable of currentEnv.variables) {
    _variables[variable.key] = variable.value
  }

  const globalEnv = getGlobalEnvironment()

  if (globalEnv) {
    for (const variable of globalEnv.variables) {
      _variables[variable.key] = variable.value
    }
  }

  try {
    // the pw object is the proxy by which pre-request scripts can pass variables to the request.
    // for security and control purposes, this is the only way a pre-request script should modify variables.
    const pw = {
      environment: {
        set: (key: string, value: string) => (_variables[key] = value),
      },
      env: {
        set: (key: string, value: string) => (_variables[key] = value),
      },
      // globals that the script is allowed to have access to.
    }

    // run pre-request script within this function so that it has access to the pw object.
    // eslint-disable-next-line no-new-func
    new Function("pw", script)(pw)
  } catch (_e) {}

  return _variables
}
