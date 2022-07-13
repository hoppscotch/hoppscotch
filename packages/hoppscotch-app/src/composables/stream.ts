import { Observable, Subscription } from "rxjs"
import { customRef, onBeforeUnmount, readonly, ref, Ref } from "vue"

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

/** A static (doesn't cleanup on itself and does
 *  not require component instace) version of useStream
 */
export function useStreamStatic<T>(
  stream$: Observable<T>,
  initialValue: T,
  setter: (val: T) => void
): [Ref<T>, () => void] {
  let sub: Subscription | null = null

  const stopper = () => {
    if (sub) {
      sub.unsubscribe()
    }
  }

  return [
    customRef((track, trigger) => {
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
    }),
    stopper
  ]
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
