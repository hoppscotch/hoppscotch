import { Subject, BehaviorSubject } from "rxjs"
import { map } from "rxjs/operators"
import { assign, clone } from "lodash-es"
import { KeysMatching } from "~/types/ts-utils"
import { SettingsDef } from "./settings"

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
  p0: {
    bulkApplySettings(
      _currentState: SettingsDef,
      payload: Partial<SettingsDef>
    ): Partial<SettingsDef>
    toggleSetting(
      currentState: SettingsDef,
      { settingKey }: { settingKey: KeysMatching<SettingsDef, boolean> }
    ): Partial<SettingsDef>
    applySetting(
      _currentState: SettingsDef,
      {
        settingKey,
        value,
      }:
        | { settingKey: "syncCollections"; value: boolean }
        | { settingKey: "syncHistory"; value: boolean }
        | { settingKey: "syncEnvironments"; value: boolean }
        | { settingKey: "PROXY_URL"; value: string }
        | {
            settingKey: "WRAP_LINES"
            value: {
              httpRequestBody: boolean
              httpResponseBody: boolean
              httpHeaders: boolean
              httpParams: boolean
              httpUrlEncoded: boolean
              httpPreRequest: boolean
              httpTest: boolean
              httpRequestVariables: boolean
              graphqlQuery: boolean
              graphqlResponseBody: boolean
              graphqlHeaders: boolean
              graphqlVariables: boolean
              graphqlSchema: boolean
              importCurl: boolean
              codeGen: boolean
              cookie: boolean
            }
          }
        | { settingKey: "CURRENT_INTERCEPTOR_ID"; value: string }
        | {
            settingKey: "URL_EXCLUDES"
            value: {
              auth: boolean
              httpUser: boolean
              httpPassword: boolean
              bearerToken: boolean
              oauth2Token: boolean
            }
          }
        | {
            settingKey: "THEME_COLOR"
            value:
              | "green"
              | "teal"
              | "blue"
              | "indigo"
              | "purple"
              | "yellow"
              | "orange"
              | "red"
              | "pink"
          }
        | {
            settingKey: "BG_COLOR"
            value: "system" | "light" | "dark" | "black"
          }
        | { settingKey: "TELEMETRY_ENABLED"; value: boolean }
        | { settingKey: "EXPAND_NAVIGATION"; value: boolean }
        | { settingKey: "SIDEBAR"; value: boolean }
        | { settingKey: "SIDEBAR_ON_LEFT"; value: boolean }
        | { settingKey: "COLUMN_LAYOUT"; value: boolean }
        | { settingKey: "HAS_OPENED_SPOTLIGHT"; value: boolean }
        | { settingKey: "ENABLE_AI_EXPERIMENTS"; value: boolean }
        | { settingKey: "max_nesting_depth"; value: number }
    ): any
    function: any
  },
  p1: unknown, // eslint-disable-next-line no-unused-vars
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
