import { Container, Service } from "dioc"
import { cloneDeep } from "lodash-es"
import { reactive, computed, watch, nextTick } from "vue"

/**
 * Defines a secret environment variable.
 * Value is the current value of the variable.
 * InitialValue is the value of the variable when it was created.
 * VarIndex is the index of the variable in the environment.
 */
export type SecretVariable = {
  key: string
  value: string
  varIndex: number
  initialValue?: string
}

/**
 * This service is used to store and manage secret environments.
 * The secret environments are not synced with the server.
 * hence they are not persisted in the database. They are stored
 * in the local storage of the browser.
 */
export class SecretEnvironmentService extends Service {
  public static readonly ID = "SECRET_ENVIRONMENT_SERVICE"

  constructor(c: Container) {
    super(c)
    // Initialize the secret environments map
    this.watchSecretEnvironments()
  }

  /**
   * Map of secret environments.
   * The key is the ID of the secret environment.
   * The value is the list of secret variables.
   */
  public secretEnvironments = reactive(new Map<string, SecretVariable[]>())

  /**
   * Add a new secret environment.
   * @param id ID of the environment
   * @param secretVars List of secret variables
   */
  public addSecretEnvironment(id: string, secretVars: SecretVariable[]) {
    this.secretEnvironments.set(id, secretVars)
  }

  /**
   * Get a secret environment.
   * @param id ID of the environment
   */
  public getSecretEnvironment(id: string) {
    return this.secretEnvironments.get(id)
  }

  /**
   * Get a secret environment variable.
   * @param id ID of the environment
   * @param varIndex Index of the variable in the environment
   */
  public getSecretEnvironmentVariable(id: string, varIndex: number) {
    const secretVars = this.getSecretEnvironment(id)
    return secretVars?.find((secretVar) => secretVar.varIndex === varIndex)
  }

  /**
   * Used to get the initial and current value of a secret environment variable.
   * @param id ID of the environment
   * @param varIndex Index of the variable in the environment
   */
  public getSecretEnvironmentVariableValue(id: string, varIndex: number) {
    const secretVar = this.getSecretEnvironmentVariable(id, varIndex)
    if (!secretVar) return null
    return {
      value: secretVar.value || "",
      initialValue: secretVar.initialValue || "",
    }
  }

  /**
   * Update the current value of a single secret variable, leaving the rest of
   * the environment's entries untouched.
   *
   * `key` is only consulted when the variable has no entry yet (for example a
   * secret edited on this device for the first time). The
   * `watchSecretEnvironments` cleanup drops environments whose variables all
   * have empty keys, so a freshly created entry must carry the real key.
   *
   * @param id ID of the environment
   * @param varIndex Index of the variable in the environment
   * @param value New current value
   * @param key Key of the variable, used only when creating a missing entry
   */
  public setSecretEnvironmentVariableValue(
    id: string,
    varIndex: number,
    value: string,
    key = ""
  ) {
    const vars = this.getSecretEnvironment(id)
    const newVars = cloneDeep(vars ?? [])
    const variable = newVars.find((v) => v.varIndex === varIndex)

    if (variable) {
      variable.value = value
    } else {
      newVars.push({ key, value, varIndex, initialValue: "" })
    }

    this.secretEnvironments.set(id, newVars)
  }

  /**
   * Rename the key of an existing secret entry so key-based lookups
   * (`hasSecretValue`, the env inspector) keep resolving after a variable is
   * renamed. No-op when there is no entry for `varIndex`.
   *
   * @param id ID of the environment
   * @param varIndex Index of the variable in the environment
   * @param key New key of the variable
   */
  public setSecretEnvironmentVariableKey(
    id: string,
    varIndex: number,
    key: string
  ) {
    const vars = this.getSecretEnvironment(id)
    if (!vars) return

    const variable = vars.find((v) => v.varIndex === varIndex)
    if (!variable || variable.key === key) return

    const newVars = cloneDeep(vars)
    newVars.find((v) => v.varIndex === varIndex)!.key = key
    this.secretEnvironments.set(id, newVars)
  }

  /**
   *
   * @param secretEnvironments Used to load secret environments from persisted state.
   */
  public loadSecretEnvironmentsFromPersistedState(
    secretEnvironments: Record<string, SecretVariable[]>
  ) {
    if (secretEnvironments) {
      this.secretEnvironments.clear()

      Object.entries(secretEnvironments).forEach(([id, secretVars]) => {
        this.addSecretEnvironment(id, secretVars)
      })
    }
  }

  /**
   * Delete a secret environment.
   * @param id ID of the environment
   */
  public deleteSecretEnvironment(id: string) {
    this.secretEnvironments.delete(id)
  }

  /**
   * Delete a secret environment variable.
   * @param id ID of the environment
   * @param varIndex Index of the variable in the environment
   */
  public removeSecretEnvironmentVariable(id: string, varIndex: number) {
    const secretVars = this.getSecretEnvironment(id)
    const newSecretVars = secretVars?.filter(
      (secretVar) => secretVar.varIndex !== varIndex
    )
    this.secretEnvironments.set(id, newSecretVars || [])
  }

  /**
   * Migrate entries from `oldID` to `newID`. Skips the `set` when nothing
   * exists under `oldID` so a no-op migrate doesn't clobber `newID`.
   */
  public updateSecretEnvironmentID(oldID: string, newID: string) {
    // No-op when keys match — without this guard the get→set→delete
    // sequence would erase the just-written entry for `oldID === newID`.
    if (oldID === newID) return
    const secretVars = this.getSecretEnvironment(oldID)
    if (secretVars !== undefined) {
      this.secretEnvironments.set(newID, secretVars)
    }
    this.secretEnvironments.delete(oldID)
  }

  /**
   *
   * @param id ID of the environment
   * @param key Key of the variable to check the value exists
   * @returns true if the key has a secret value
   */
  public hasSecretValue(id: string, key: string) {
    return (
      this.secretEnvironments.has(id) &&
      this.secretEnvironments
        .get(id)!
        .some((secretVar) => secretVar.key === key && secretVar.value !== "")
    )
  }

  /**
   * Checks if a secret variable has an initial value set.
   * @param id ID of the environment
   * @param key Key of the variable to check the initial value exists
   * @returns true if the key has an initial value
   */
  public hasSecretInitialValue(id: string, key: string) {
    return (
      this.secretEnvironments.has(id) &&
      this.secretEnvironments
        .get(id)!
        .some((secretVar) => secretVar.key === key && secretVar.initialValue)
    )
  }

  /**
   * Used to update the value of a secret environment variable.
   */
  public persistableSecretEnvironments = computed(() => {
    const secretEnvironments: Record<string, SecretVariable[]> = {}
    this.secretEnvironments.forEach((secretVars, id) => {
      secretEnvironments[id] = secretVars
    })
    return secretEnvironments
  })

  /**
   * Watches the secret environments for changes.
   * If a secret variable is removed or has an empty key, it will be deleted.
   */
  protected watchSecretEnvironments() {
    watch(
      () => this.secretEnvironments,
      () => {
        nextTick(() => {
          this.secretEnvironments.forEach((secretVars, id) => {
            const filteredVars = secretVars.filter((v) => v.key !== "")

            if (filteredVars.length === 0) {
              this.secretEnvironments.delete(id)
            }
          })
        })
      },
      { deep: true }
    )
  }
}
