export const createMapper = () => {
  const indexBackendIDMap = new Map<number, string | undefined>()
  const backendIdIndexMap = new Map<string, number | undefined>()

  return {
    addEntry(localIndex: number, backendId: string) {
      indexBackendIDMap.set(localIndex, backendId)
      backendIdIndexMap.set(backendId, localIndex)
    },
    getValue() {
      return indexBackendIDMap
    },
    getBackendIdByIndex(localIndex: number) {
      return indexBackendIDMap.get(localIndex)
    },
    getIndexByBackendId(backendId: string) {
      return backendIdIndexMap.get(backendId)
    },
    removeEntry(backendId?: string, index?: number) {
      if (backendId) {
        const index = backendIdIndexMap.get(backendId)

        backendIdIndexMap.delete(backendId)
        index && indexBackendIDMap.delete(index)
      } else if (index) {
        const backendId = indexBackendIDMap.get(index)

        indexBackendIDMap.delete(index)
        backendId && backendIdIndexMap.delete(backendId)
      }
    },
  }
}
