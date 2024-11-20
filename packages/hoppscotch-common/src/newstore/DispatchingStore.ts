import { Subject, BehaviorSubject } from "rxjs"
import { map } from "rxjs/operators"
import { assign, clone } from "lodash-es"

type DispatcherFunc<StoreType, PayloadType> = (
  currentVal: StoreType,
  payload: PayloadType
) => Partial<StoreType>

/**
 * Defines a dispatcher.
 *
 * This function exists to provide better typing for dispatch function.
 * As you can see, its pretty much an identity function.
 */
export const defineDispatchers = <
  StoreType,
  T extends { [x: string]: DispatcherFunc<StoreType, any> },
>(
  // eslint-disable-next-line no-unused-vars
  dispatchers: T
) => dispatchers

type Dispatch<
  StoreType,
  DispatchersType extends { [x: string]: DispatcherFunc<StoreType, any> },
> = {
  [Dispatcher in keyof DispatchersType]: {
    dispatcher: Dispatcher
    payload: Parameters<DispatchersType[Dispatcher]>[1]
  }
}[keyof DispatchersType]

export default class DispatchingStore<
  StoreType,
  DispatchersType extends { [x: string]: DispatcherFunc<StoreType, any> },
> {
  #state$: BehaviorSubject<StoreType>
  #dispatchers: DispatchersType
  #dispatches$: Subject<Dispatch<StoreType, DispatchersType>> = new Subject()

  constructor(initialValue: StoreType, dispatchers: DispatchersType) {
    this.#state$ = new BehaviorSubject(initialValue)
    this.#dispatchers = dispatchers

    this.#dispatches$
      .pipe(
        map(({ dispatcher, payload }) =>
          this.#dispatchers[dispatcher](this.value, payload)
        )
      )
      .subscribe((val) => {
        const data = clone(this.value)
        assign(data, val)

        this.#state$.next(data)
      })
  }

  get subject$() {
    return this.#state$
  }

  get value() {
    return this.subject$.value
  }

  get dispatches$() {
    return this.#dispatches$
  }

  dispatch({ dispatcher, payload }: Dispatch<StoreType, DispatchersType>) {
    if (!this.#dispatchers[dispatcher])
      throw new Error(`Undefined dispatch type '${String(dispatcher)}'`)

    this.#dispatches$.next({ dispatcher, payload })
  }
}
