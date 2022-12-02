import { combineLatest, Observable } from "rxjs"
import { map } from "rxjs/operators"

/**
 * Constructs a stream of a object from a collection of other observables
 *
 * @param streamObj The object containing key of observables to assemble from
 *
 * @returns The constructed object observable
 */
export function constructFromStreams<T>(streamObj: {
  [key in keyof T]: Observable<T[key]>
}): Observable<T> {
  return combineLatest(Object.values<Observable<T[keyof T]>>(streamObj)).pipe(
    map((streams) => {
      const keys = Object.keys(streamObj) as (keyof T)[]

      return keys.reduce(
        (acc, s, i) => Object.assign(acc, { [s]: streams[i] }),
        {}
      ) as T
    })
  )
}
