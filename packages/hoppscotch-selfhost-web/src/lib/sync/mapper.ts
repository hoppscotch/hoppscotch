export const createMapper = <
  LocalIDType extends string | number,
  BackendIDType extends string | number
>() => {
  const backendIDByLocalIDMap = new Map<
    LocalIDType,
    BackendIDType | undefined
  >()
  const localIDByBackendIDMap = new Map<
    BackendIDType,
    LocalIDType | undefined
  >()

  return {
    addEntry(localIdentifier: LocalIDType, backendIdentifier: BackendIDType) {
      backendIDByLocalIDMap.set(localIdentifier, backendIdentifier)
      localIDByBackendIDMap.set(backendIdentifier, localIdentifier)
    },
    getValue() {
      return backendIDByLocalIDMap
    },
    getBackendIDByLocalID(localIdentifier: LocalIDType) {
      return backendIDByLocalIDMap.get(localIdentifier)
    },
    getLocalIDByBackendID(backendId: BackendIDType) {
      return localIDByBackendIDMap.get(backendId)
    },
    removeEntry(backendId?: BackendIDType, index?: LocalIDType) {
      if (backendId) {
        const index = localIDByBackendIDMap.get(backendId)

        localIDByBackendIDMap.delete(backendId)
        index && backendIDByLocalIDMap.delete(index)
      } else if (index) {
        const backendId = backendIDByLocalIDMap.get(index)

        backendIDByLocalIDMap.delete(index)
        backendId && localIDByBackendIDMap.delete(backendId)
      }
    },
  }
}
