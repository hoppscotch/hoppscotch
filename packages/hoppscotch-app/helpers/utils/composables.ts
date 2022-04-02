import {
  customRef,
  onBeforeUnmount,
  readonly,
  Ref,
  ref,
  shallowRef,
  useContext,
  watch,
  wrapProperty,
} from "@nuxtjs/composition-api"
import { Observable, Subscription } from "rxjs"

export const useNuxt = wrapProperty("$nuxt")

export function useReadonlyStream<T>(
  stream$: Observable<T>,
  initialValue: T
): Ref<T> {
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

  return readonly(targetRef) as Ref<T>
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

export type StreamSubscriberFunc = <T>(
  stream: Observable<T>,
  next?: ((value: T) => void) | undefined,
  error?: ((e: any) => void) | undefined,
  complete?: (() => void) | undefined
) => void

/**
 * A composable that provides the ability to run streams
 * and subscribe to them and respect the component lifecycle.
 */
export function useStreamSubscriber(): {
  subscribeToStream: StreamSubscriberFunc
} {
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

export function useColorMode() {
  const { $colorMode } = useContext()

  return $colorMode
}

export function useAxios() {
  const { $axios } = useContext()
  return $axios
}

export function usePolled<T>(
  pollDurationMS: number,
  pollFunc: (stopPolling: () => void) => T
): Ref<T> {
  let polling = true
  let handle: ReturnType<typeof setInterval> | undefined

  const stopPolling = () => {
    if (handle) {
      clearInterval(handle)
      handle = undefined
      polling = false
    }
  }

  const result = shallowRef(pollFunc(stopPolling))

  if (polling) {
    handle = setInterval(() => {
      result.value = pollFunc(stopPolling)
    }, pollDurationMS)
  }

  onBeforeUnmount(() => {
    if (polling) stopPolling()
  })

  return result
}
