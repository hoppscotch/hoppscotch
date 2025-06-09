export type InstancePlatformDef = {
  instanceType: 'vendored' | 'cloud'
  displayConfig: {
    displayName: string
    description: string
    version: string
    connectingMessage: string
    connectedMessage: string
  }
}
