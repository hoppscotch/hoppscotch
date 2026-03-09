import { clone, cloneDeep } from 'lodash-es';
import { Observable, Subscription } from 'rxjs';
import { customRef, onBeforeUnmount, readonly, Ref } from 'vue';

type CloneMode = 'noclone' | 'shallow' | 'deep';

/**
 * Returns a readonly (no writes) ref for an RxJS Observable
 * @param stream$ The RxJS Observable to listen to
 * @param initialValue The initial value to apply until the stream emits a value
 * @param cloneMode Determines whether or not and how deep to clone the emitted value.
 *                  Useful for issues in reactivity due to reference sharing. Defaults to shallow clone
 * @returns A readonly ref which has the latest value from the stream
 */
export function useReadonlyStream<T>(
  stream$: Observable<T>,
  initialValue: T,
  cloneMode: CloneMode = 'shallow'
): Ref<T> {
  let sub: Subscription | null = null;

  onBeforeUnmount(() => {
    if (sub) {
      sub.unsubscribe();
    }
  });

  const r = customRef((track, trigger) => {
    let val = initialValue;

    sub = stream$.subscribe((value) => {
      if (cloneMode === 'noclone') {
        val = value;
      } else if (cloneMode === 'shallow') {
        val = clone(value);
      } else if (cloneMode === 'deep') {
        val = cloneDeep(value);
      }

      trigger();
    });

    return {
      get() {
        track();
        return val;
      },
      set() {
        trigger(); // <- Not exactly needed here
        throw new Error('Cannot write to a ref from useReadonlyStream');
      },
    };
  });

  // Casting to still maintain the proper type signature for ease of use
  return readonly(r) as Ref<T>;
}

export function useStream<T>(
  stream$: Observable<T>,
  initialValue: T,
  setter: (val: T) => void
) {
  let sub: Subscription | null = null;

  onBeforeUnmount(() => {
    if (sub) {
      sub.unsubscribe();
    }
  });

  return customRef((track, trigger) => {
    let value = initialValue;

    sub = stream$.subscribe((val) => {
      value = val;
      trigger();
    });

    return {
      get() {
        track();
        return value;
      },
      set(value: T) {
        trigger();
        setter(value);
      },
    };
  });
}

/** A static (doesn't cleanup itself and doesn't
 *  require component instance) version of useStream
 */
export function useStreamStatic<T>(
  stream$: Observable<T>,
  initialValue: T,
  setter: (val: T) => void
): [Ref<T>, () => void] {
  let sub: Subscription | null = null;

  const stopper = () => {
    if (sub) {
      sub.unsubscribe();
    }
  };

  return [
    customRef((track, trigger) => {
      let value = initialValue;

      sub = stream$.subscribe((val) => {
        value = val;
        trigger();
      });

      return {
        get() {
          track();
          return value;
        },
        set(value: T) {
          trigger();
          setter(value);
        },
      };
    }),
    stopper,
  ];
}

export type StreamSubscriberFunc = <T>(
  stream: Observable<T>,
  next?: ((value: T) => void) | undefined,
  error?: ((e: any) => void) | undefined,
  complete?: (() => void) | undefined
) => void;

/**
 * A composable that provides the ability to run streams
 * and subscribe to them and respect the component lifecycle.
 */
export function useStreamSubscriber(): {
  subscribeToStream: StreamSubscriberFunc;
} {
  const subs: Subscription[] = [];

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
        if (complete) complete();
        subs.splice(subs.indexOf(sub), 1);
      },
    });

    subs.push(sub);
  };

  onBeforeUnmount(() => {
    subs.forEach((sub) => sub.unsubscribe());
  });

  return {
    subscribeToStream: runAndSubscribe,
  };
}
