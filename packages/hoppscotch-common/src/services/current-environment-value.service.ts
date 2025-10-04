import { Container, Service } from "dioc"
import { cloneDeep } from "lodash-es"
import { nextTick } from "vue"
import { watch } from "vue"
import { reactive, computed } from "vue"

/**
 * Defines a environment variable.
 */
export type Variable = {
  key: string
  currentValue: string
  varIndex: number
  isSecret: boolean
}

/**
 * This service is used to store and manage current value of environment variables.
 * The current value are not synced with the server.
 * hence they are not persisted in the database. They are stored
 * in the local storage of the browser.
 */
export class CurrentValueService extends Service {
  public static readonly ID = "CURRENT_VALUE_SERVICE"

  constructor(c: Container) {
    super(c)
    // Initialize the secret environments map
    this.watchCurrentEnvironments()
  }

  /**
   * Map of current value of environments.
   * The key is the ID of the environment.
   * The value is the list of environment variables.
   */
  public environments = reactive(new Map<string, Variable[]>())

  /**
   * Add a new environment.
   * @param id ID of the environment
   * @param vars List of environment variables
   */
  public addEnvironment(id: string, vars: Variable[]) {
    this.environments.set(id, vars)
  }

  /**
   * Get a environment.
   * @param id ID of the environment
   */
  public getEnvironment(id: string) {
    return this.environments.get(id)
  }

  /**
   * Add a new environment variable to the environment.
   * If the environment does not exist, it will be created.
   * @param id ID of the environment
   * @param variable Environment variable to add
   */
  public addEnvironmentVariable(id: string, variable: Variable) {
    const vars = this.getEnvironment(id)
    if (vars) {
      const newVars = cloneDeep(vars)
      newVars.push(variable)
      this.environments.set(id, newVars)
    } else {
      this.environments.set(id, [variable])
    }
  }

  /**
   * Get a environment variable.
   * @param id ID of the environment
   * @param varIndex Index of the variable in the environment
   */
  public getEnvironmentVariable(id: string, varIndex: number) {
    const vars = this.getEnvironment(id)
    return vars?.find((v) => v.varIndex === varIndex)
  }

  /**
   * Used to get the value of a environment variable.
   * @param id ID of the environment
   * @param varIndex Index of the variable in the environment
   */
  public getEnvironmentVariableValue(id: string, varIndex: number) {
    const variable = this.getEnvironmentVariable(id, varIndex)
    return variable?.currentValue
  }

  /**
   *
   * @param environments Used to load environments from persisted state.
   */
  public loadEnvironmentsFromPersistedState(
    environments: Record<string, Variable[]>
  ) {
    if (environments) {
      this.environments.clear()

      Object.entries(environments).forEach(([id, vars]) => {
        this.addEnvironment(id, vars)
      })
    }
  }

  /**
   * Delete a environment.
   * @param id ID of the environment
   */
  public deleteEnvironment(id: string) {
    this.environments.delete(id)
  }

  /**
   * Delete a environment variable.
   * @param id ID of the environment
   * @param varIndex Index of the variable in the environment
   */
  public removeEnvironmentVariable(id: string, varIndex: number) {
    const vars = this.getEnvironment(id)
    const newVars = vars?.filter((v) => v.varIndex !== varIndex)
    this.environments.set(id, newVars || [])
  }

  /**
   * Used to update the ID of a environment.
   * Used while syncing with the server.
   * @param oldID old ID of the environment
   * @param newID new ID of the environment
   */
  public updateEnvironmentID(oldID: string, newID: string) {
    const vars = this.getEnvironment(oldID)
    this.environments.set(newID, vars || [])
    this.environments.delete(oldID)
  }

  /**
   *
   * @param id ID of the environment
   * @param key Key of the variable to check the value exists
   * @returns true if the key has a secret value
   */
  public hasValue(id: string, key: string) {
    return (
      this.environments.has(id) &&
      this.environments
        .get(id)!
        .some((v) => v.key === key && v.currentValue !== "")
    )
  }

  public getEnvironmentByKey(id: string, key: string) {
    const vars = this.getEnvironment(id)
    return vars?.find((v) => v.key === key)
  }

  /**
   * Used to update the value of a environment variable.
   */
  public persistableEnvironments = computed(() => {
    const environments: Record<string, Variable[]> = {}
    this.environments.forEach((vars, id) => {
      environments[id] = vars
    })
    return environments
  })

  /**
   * Watches the current environments for changes.
   * If a secret variable is removed or has an empty key, it will be deleted.
   */
  protected watchCurrentEnvironments() {
    watch(
      () => this.environments,
      () => {
        nextTick(() => {
          this.environments.forEach((vars, id) => {
            const filteredVars = vars.filter((v) => v.key !== "")

            if (filteredVars.length === 0) {
              this.environments.delete(id)
            }
          })
        })
      },
      { deep: true }
    )
  }
}
