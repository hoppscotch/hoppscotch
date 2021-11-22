import {
  customRef,
  DeepReadonly,
  onBeforeUnmount,
  readonly,
  Ref,
  ref,
  useContext,
  watch,
  wrapProperty,
} from "@nuxtjs/composition-api"
import { Observable, Subscription } from "rxjs"

export const useNuxt = wrapProperty("$nuxt")

export function useReadonlyStream<T>(
  stream$: Observable<T>,
  initialValue: T
): Ref<DeepReadonly<T>> {
  let sub: Subscription | null = null

  onBeforeUnmount(() => {
    if (sub) {
      sub.unsubscribe()
    }
  })

  const targetRef = ref(initialValue) as Ref<T>

  sub = stream$.subscribe((value) => {
    targetRef.value = value
  })

  return readonly(targetRef)
}

export function useStream<T>(
  stream$: Observable<T>,
  initialValue: T,
  setter: (val: T) => void
) {
  let sub: Subscription | null = null

  onBeforeUnmount(() => {
    if (sub) {
      sub.unsubscribe()
    }
  })

  return customRef((track, trigger) => {
    let value = initialValue

    sub = stream$.subscribe((val) => {
      value = val
      trigger()
    })

    return {
      get() {
        track()
        return value
      },
      set(value: T) {
        trigger()
        setter(value)
      },
    }
  })
}

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

/**
 * A composable that provides the ability to run streams
 * and subscribe to them and respect the component lifecycle.
 */
export function useStreamSubscriber() {
  const subs: Subscription[] = []

  const runAndSubscribe = <T>(
    stream: Observable<T>,
    next?: (value: T) => void,
    error?: (e: any) => void,
    complete?: () => void
  ) => {
    const sub = stream.subscribe({
      next,
      error,
      complete: () => {
        if (complete) complete()
        subs.splice(subs.indexOf(sub), 1)
      },
    })

    subs.push(sub)
  }

  onBeforeUnmount(() => {
    subs.forEach((sub) => sub.unsubscribe())
  })

  return {
    subscribeToStream: runAndSubscribe,
  }
}

export function useI18n() {
  const {
    app: { i18n },
  } = useContext()
  return i18n.t.bind(i18n)
}

export function useToast() {
  const { $toast } = useContext()
  return $toast
}
