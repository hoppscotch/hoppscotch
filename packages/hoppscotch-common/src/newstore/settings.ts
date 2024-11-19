import { cloneDeep, defaultsDeep, has } from "lodash-es"
import { Observable } from "rxjs"
import { distinctUntilChanged, pluck } from "rxjs/operators"
import type { KeysMatching } from "~/types/ts-utils"
import DispatchingStore, { defineDispatchers } from "./DispatchingStore"
import {
  GraphQLSchema,
  IntrospectionQuery,
  buildClientSchema,
  getIntrospectionQuery,
} from "graphql"
import { ref } from "vue"
import { buildQuery } from "~/helpers/graphql/queryBuilder"
import { getService } from "~/modules/dioc"
import { PersistenceService } from "~/services/persistence"

export const HoppBgColors = ["system", "light", "dark", "black"] as const

export type HoppBgColor = (typeof HoppBgColors)[number]

export const HoppAccentColors = [
  "green",
  "teal",
  "blue",
  "indigo",
  "purple",
  "yellow",
  "orange",
  "red",
  "pink",
] as const

export const EncodeModes = ["enable", "disable", "auto"] as const

export type EncodeMode = (typeof EncodeModes)[number]

export type HoppAccentColor = (typeof HoppAccentColors)[number]

export type SettingsDef = {
  syncCollections: boolean
  syncHistory: boolean
  syncEnvironments: boolean

  PROXY_URL: string

  WRAP_LINES: {
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

  CURRENT_INTERCEPTOR_ID: string

  URL_EXCLUDES: {
    auth: boolean
    httpUser: boolean
    httpPassword: boolean
    bearerToken: boolean
    oauth2Token: boolean
  }
  THEME_COLOR: HoppAccentColor
  BG_COLOR: HoppBgColor
  ENCODE_MODE: EncodeMode
  TELEMETRY_ENABLED: boolean
  EXPAND_NAVIGATION: boolean
  SIDEBAR: boolean
  SIDEBAR_ON_LEFT: boolean
  COLUMN_LAYOUT: boolean

  HAS_OPENED_SPOTLIGHT: boolean
  ENABLE_AI_EXPERIMENTS: boolean
  // define the max_nesting_depth setting variable
  max_nesting_depth: number
}

export const getDefaultSettings = (): SettingsDef => ({
  syncCollections: true,
  syncHistory: true,
  syncEnvironments: true,

  WRAP_LINES: {
    httpRequestBody: true,
    httpResponseBody: true,
    httpHeaders: true,
    httpParams: true,
    httpUrlEncoded: true,
    httpPreRequest: true,
    httpTest: true,
    httpRequestVariables: true,
    graphqlQuery: true,
    graphqlResponseBody: true,
    graphqlHeaders: false,
    graphqlVariables: false,
    graphqlSchema: true,
    importCurl: true,
    codeGen: true,
    cookie: true,
  },

  // Set empty because interceptor module will set the default value
  CURRENT_INTERCEPTOR_ID: "",

  // TODO: Interceptor related settings should move under the interceptor systems
  PROXY_URL: "https://proxy.hoppscotch.io/",
  URL_EXCLUDES: {
    auth: true,
    httpUser: true,
    httpPassword: true,
    bearerToken: true,
    oauth2Token: true,
  },
  THEME_COLOR: "indigo",
  BG_COLOR: "system",
  ENCODE_MODE: "enable",
  TELEMETRY_ENABLED: true,
  EXPAND_NAVIGATION: false,
  SIDEBAR: true,
  SIDEBAR_ON_LEFT: false,
  COLUMN_LAYOUT: true,

  HAS_OPENED_SPOTLIGHT: false,
  ENABLE_AI_EXPERIMENTS: true,

  // default value for max_nesting_depth set to 3
  max_nesting_depth: 3,
})

type ApplySettingPayload = {
  [K in keyof SettingsDef]: {
    settingKey: K
    value: SettingsDef[K]
  }
}[keyof SettingsDef]

type ApplyNestedSettingPayload = {
  [K in KeysMatching<SettingsDef, Record<string, any>>]: {
    [P in keyof SettingsDef[K]]: {
      settingKey: K
      property: P
      value: SettingsDef[K][P]
    }
  }[keyof SettingsDef[K]]
}[KeysMatching<SettingsDef, Record<string, any>>]

export const max_nesting_depth = ref(getDefaultSettings().max_nesting_depth)
// function that gets and then parses graphql schema
export async function fetchGraphQLSchema(
  endpoint: string
): Promise<GraphQLSchema> {
  const introspectionQuery = getIntrospectionQuery()
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: introspectionQuery }),
  })
  // error handling
  if (!response.ok) {
    throw new Error("Error : failed when fetching GraphQL schema")
  }
  const result = await response.json()
  // change introspection data to a schema
  return buildClientSchema(result.data as IntrospectionQuery)
}

const dispatchers = defineDispatchers({
  bulkApplySettings(_currentState: SettingsDef, payload: Partial<SettingsDef>) {
    return payload
  },
  toggleSetting(
    currentState: SettingsDef,
    { settingKey }: { settingKey: KeysMatching<SettingsDef, boolean> }
  ) {
    if (!has(currentState, settingKey)) {
      // console.log(
      //   `Toggling of a non-existent setting key '${settingKey}' ignored`
      // )
      return {}
    }

    const result: Partial<SettingsDef> = {}
    result[settingKey] = !currentState[settingKey]

    return result
  },
  // allows the dispatchers to be able to handle the new max_nesting_depth setting
  applySetting(
    _currentState: SettingsDef,
    { settingKey, value }: ApplySettingPayload
  ) {
    const result: Partial<SettingsDef> = { [settingKey]: value }
    if (settingKey === "max_nesting_depth") max_nesting_depth.value = value
    return result
  },
  toggleNestedSetting(
    currentState: SettingsDef,
    {
      settingKey,
      property,
    }: {
      settingKey: KeysMatching<SettingsDef, Record<string, boolean>>
      property: KeysMatching<SettingsDef[typeof settingKey], boolean>
    }
  ) {
    if (!has(currentState, [settingKey, property])) {
      return {}
    }

    const result: Partial<SettingsDef> = {
      [settingKey]: {
        ...currentState[settingKey],
        [property]: !currentState[settingKey][property],
      },
    }

    return result
  },
  applyNestedSetting(
    _currentState: SettingsDef,
    { settingKey, property, value }: ApplyNestedSettingPayload
  ) {
    const result: Partial<SettingsDef> = {
      [settingKey]: {
        [property]: value,
      },
    }

    return result
  },
})

export const settingsStore = new DispatchingStore(
  getDefaultSettings(),
  dispatchers
)

/**
 * An observable value to make avail all the state information at once
 */
export const settings$ = settingsStore.subject$.asObservable()

export function getSettingSubject<K extends keyof SettingsDef>(
  settingKey: K
): Observable<SettingsDef[K]> {
  return settingsStore.subject$.pipe(pluck(settingKey), distinctUntilChanged())
}

export function bulkApplySettings(settingsObj: Partial<SettingsDef>) {
  settingsStore.dispatch({
    dispatcher: "bulkApplySettings",
    payload: settingsObj,
  })
}

export function toggleSetting(settingKey: KeysMatching<SettingsDef, boolean>) {
  settingsStore.dispatch({
    dispatcher: "toggleSetting",
    payload: {
      settingKey,
    },
  })
}

// make the function to toggle the setting for maximum nesting depth avaiable for use by other files
export function toggleNestedSetting<
  K extends KeysMatching<SettingsDef, Record<string, boolean>>,
  P extends keyof SettingsDef[K],
>(settingKey: K, property: P) {
  settingsStore.dispatch({
    dispatcher: "toggleNestedSetting",
    payload: {
      settingKey,
      property,
    },
  })
}

export function applySetting<K extends keyof SettingsDef>(
  settingKey: K,
  value: SettingsDef[K]
) {
  settingsStore.dispatch({
    dispatcher: "applySetting",
    payload: {
      settingKey,
      value,
    },
  })

  const persistenceService = getService(PersistenceService)
  persistenceService.setLocalConfig(settingKey, value.toString()) // enables persistance in localStorage (used for max_nesting_depth)
}

export function applyNestedSetting<
  K extends KeysMatching<SettingsDef, Record<string, any>>,
  P extends keyof SettingsDef[K],
  R extends SettingsDef[K][P],
>(settingKey: K, property: P, value: R) {
  settingsStore.dispatch({
    dispatcher: "applyNestedSetting",
    payload: {
      settingKey,
      property,
      value,
    },
  })
}

export function performSettingsDataMigrations(data: any): SettingsDef {
  const source = cloneDeep(data)

  if (source["EXTENSIONS_ENABLED"]) {
    const result = JSON.parse(source["EXTENSIONS_ENABLED"])

    if (result) source["CURRENT_INTERCEPTOR_ID"] = "extension"
    delete source["EXTENSIONS_ENABLED"]
  }

  if (source["PROXY_ENABLED"]) {
    const result = JSON.parse(source["PROXY_ENABLED"])

    if (result) source["CURRENT_INTERCEPTOR_ID"] = "proxy"
    delete source["PROXY_ENABLED"]
  }

  const final = defaultsDeep(source, getDefaultSettings())

  return final
}

export function generateQuery(
  schema: GraphQLSchema,
  max_nesting_depth: number
): string {
  // error handling
  if (!schema) {
    throw new Error("Error: Schema not loaded")
  }
  // gets the query type from the schema
  const queryType = schema.getQueryType()
  // error handling
  if (!queryType) {
    throw new Error("Error: Query type not found in schema")
  }
  return buildQuery(queryType, max_nesting_depth)
}
