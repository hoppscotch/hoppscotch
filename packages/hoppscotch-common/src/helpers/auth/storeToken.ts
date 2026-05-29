import { 
  addEnvironmentVariable, 
  getCurrentEnvironment, 
  getSelectedEnvironmentIndex 
} from "~/newstore/environments"

export function storeTokenInEnvironment(
  tokenValue: string, 
  variableName: string
): boolean {
  try {
    const selectedEnvIndex = getSelectedEnvironmentIndex()
    
    if (selectedEnvIndex.type === "MY_ENV") {
      addEnvironmentVariable(selectedEnvIndex.index, {
        key: variableName,
        currentValue: tokenValue,
        initialValue: tokenValue,
        secret: false // tokens are typically not secret in this context
      })
      return true
    }
    
    return false
  } catch (error) {
    console.error("Failed to store token in environment:", error)
    return false
  }
}