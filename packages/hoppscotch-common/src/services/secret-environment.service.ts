import { Service } from "dioc"
import { reactive } from "vue"
import { computed } from "vue"

type SecretVariable = {
  key: string
  value: string
  varIndex: number
}

export class SecretEnvironmentService extends Service {
  public static readonly ID = "SECRET_ENVIRONMENT_SERVICE"

  public secretEnvironments = reactive(new Map<string, SecretVariable[]>())

  constructor() {
    super()
  }

  public addSecretEnvironment(id: string, secretVars: SecretVariable[]) {
    this.secretEnvironments.set(id, secretVars)
  }

  public getSecretEnvironment(id: string) {
    return this.secretEnvironments.get(id)
  }

  public getSecretEnvironmentVariable(id: string, varIndex: number) {
    const secretVars = this.getSecretEnvironment(id)
    return secretVars?.find((secretVar) => secretVar.varIndex === varIndex)
  }

  public getSecretEnvironmentVariableValue(id: string, varIndex: number) {
    const secretVar = this.getSecretEnvironmentVariable(id, varIndex)
    return secretVar?.value
  }

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

  public deleteSecretEnvironment(id: string) {
    this.secretEnvironments.delete(id)
  }

  public removeSecretEnvironmentVariable(id: string, varIndex: number) {
    const secretVars = this.getSecretEnvironment(id)
    const newSecretVars = secretVars?.filter(
      (secretVar) => secretVar.varIndex !== varIndex
    )
    this.secretEnvironments.set(id, newSecretVars || [])
  }

  public updateSecretEnvironmentID(oldID: string, newID: string) {
    const secretVars = this.getSecretEnvironment(oldID)
    this.secretEnvironments.set(newID, secretVars || [])
    this.secretEnvironments.delete(oldID)
  }

  public persistableSecretEnvironments = computed(() => {
    const secretEnvironments: Record<string, SecretVariable[]> = {}
    this.secretEnvironments.forEach((secretVars, id) => {
      secretEnvironments[id] = secretVars
    })
    return secretEnvironments
  })
}
