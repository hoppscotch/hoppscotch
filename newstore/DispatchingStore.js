import { Subject, BehaviorSubject } from "rxjs"
import { map } from "rxjs/operators"
import assign from "lodash/assign"
import clone from "lodash/clone"

export default class DispatchingStore {

  #state$
  #dispatchers
  #dispatches$ = new Subject()

  constructor(initialValue, dispatchers) {
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

  dispatch({ dispatcher, payload }) {
    if (!this.#dispatchers[dispatcher]) throw new Error(`Undefined dispatch type '${dispatcher}'`)

    this.#dispatches$.next({ dispatcher, payload })
  }
}
