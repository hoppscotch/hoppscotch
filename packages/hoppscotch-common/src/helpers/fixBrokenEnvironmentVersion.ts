import {
  Environment,
  translateToNewEnvironmentVariables,
} from "@hoppscotch/data"

/**
 * Fixes broken environment versions in the given environments.
 * This function ensures that all environment variables are translated
 * to the new format, which is necessary for compatibility with the latest
 * version of the application.
 *
 * Some environments may have been created with an unsupported
 * variable format, which can lead to issues when trying to access or manipulate those environments.
 *
 *
 * @param envs - The array of environments to fix.
 * @returns The fixed array of environments with updated variable formats.
 */
export const fixBrokenEnvironmentVersion = (envs: Environment[]) => {
  if (!Array.isArray(envs)) {
    return envs
  }
  return envs.map((env) => ({
    ...env,
    variables: (env.variables ?? []).map(translateToNewEnvironmentVariables),
  }))
}
