import { customRef, onBeforeUnmount, Ref, watch } from "vue"

export function pluckRef<T, K extends keyof T>(ref: Ref<T>, key: K): Ref<T[K]> {
  return customRef((track, trigger) => {
    const stopWatching = watch(ref, (newVal, oldVal) => {
      if (newVal[key] !== oldVal[key]) {
        trigger()
      }
    })

    onBeforeUnmount(() => {
      stopWatching()
    })

    return {
      get() {
        track()
        return ref.value[key]
      },
      set(value: T[K]) {
        trigger()
        ref.value = Object.assign(ref.value, { [key]: value })
      },
    }
  })
}

export function pluckMultipleFromRef<T, K extends Array<keyof T>>(
  sourceRef: Ref<T>,
  keys: K
): { [key in K[number]]: Ref<T[key]> } {
  return Object.fromEntries(keys.map((x) => [x, pluckRef(sourceRef, x)])) as any
}
