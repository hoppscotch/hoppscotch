import { Subject, BehaviorSubject } from "rxjs"
import { map } from "rxjs/operators"
import assign from "lodash/assign"
import clone from "lodash/clone"

type dispatcherFunc<StoreType> = (
  currentVal: StoreType,
  payload: any
) => Partial<StoreType>

/**
 * Defines a dispatcher.
 *
 * This function exists to provide better typing for dispatch function.
 * As you can see, its pretty much an identity function.
 */
export const defineDispatchers = <StoreType, T>(
  // eslint-disable-next-line no-unused-vars
  dispatchers: { [_ in keyof T]: dispatcherFunc<StoreType> }
) => dispatchers

type Dispatch<
  StoreType,
  DispatchersType extends Record<string, dispatcherFunc<StoreType>>
> = {
  dispatcher: keyof DispatchersType
  payload: any
}

export default class DispatchingStore<
  StoreType,
  DispatchersType extends Record<string, dispatcherFunc<StoreType>>
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
      throw new Error(`Undefined dispatch type '${dispatcher}'`)

    this.#dispatches$.next({ dispatcher, payload })
  }
}
