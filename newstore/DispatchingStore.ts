import { Subject, BehaviorSubject } from "rxjs"
import { map } from "rxjs/operators"
import assign from "lodash/assign"
import clone from "lodash/clone"


type Dispatch<StoreType, DispatchersType extends Dispatchers<StoreType>, K extends keyof DispatchersType> = {
  dispatcher: K & string,
  payload: any
}

export type Dispatchers<StoreType> = { 
  [ key: string ]: (currentVal: StoreType, payload: any) => Partial<StoreType> 
}

export default class DispatchingStore<StoreType, DispatchersType extends Dispatchers<StoreType>> {

  #state$: BehaviorSubject<StoreType>
  #dispatchers: Dispatchers<StoreType>
  #dispatches$: Subject<Dispatch<StoreType, DispatchersType, keyof DispatchersType>> = new Subject()

  constructor(initialValue: StoreType, dispatchers: DispatchersType) {
    this.#state$ = new BehaviorSubject(initialValue)
    this.#dispatchers = dispatchers

    this.#dispatches$
      .pipe(
        map(
          ({ dispatcher, payload }) => this.#dispatchers[dispatcher](this.value, payload)
        )
      ).subscribe(val => {
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

  dispatch({ dispatcher, payload }: Dispatch<StoreType, DispatchersType, keyof DispatchersType>) {
    if (!this.#dispatchers[dispatcher]) throw new Error(`Undefined dispatch type '${dispatcher}'`)

    this.#dispatches$.next({ dispatcher, payload })
  }
}
