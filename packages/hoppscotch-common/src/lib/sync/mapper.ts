export const createMapper = <
  LocalIDType extends string | number,
  BackendIDType extends string | number,
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
      if (backendId != null) {
        const localIndex = localIDByBackendIDMap.get(backendId)

        localIDByBackendIDMap.delete(backendId)
        localIndex != null && backendIDByLocalIDMap.delete(localIndex)
      } else if (index != null) {
        const backendIdForLocal = backendIDByLocalIDMap.get(index)

        backendIDByLocalIDMap.delete(index)
        backendIdForLocal != null &&
          localIDByBackendIDMap.delete(backendIdForLocal)
      }
    },
  }
}
