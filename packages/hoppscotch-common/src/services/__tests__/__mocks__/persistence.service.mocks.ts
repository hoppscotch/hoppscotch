import {
  Environment,
  HoppCollection,
  HoppGQLRequest,
  HoppRESTRequest,
} from "@hoppscotch/data"

import { HoppGQLDocument } from "~/helpers/graphql/document"
import { HoppRESTDocument } from "~/helpers/rest/document"
import { GQLHistoryEntry, RESTHistoryEntry } from "~/newstore/history"
import { SettingsDef, getDefaultSettings } from "~/newstore/settings"
import { PersistableTabState } from "~/services/tab"

type VUEX_DATA = {
  postwoman: {
    settings?: SettingsDef
    collections?: HoppCollection<HoppRESTRequest>[]
    collectionsGraphql?: HoppCollection<HoppGQLRequest>[]
    environments?: Environment[]
  }
}

const DEFAULT_SETTINGS = getDefaultSettings()

export const REST_COLLECTIONS: HoppCollection<HoppRESTRequest>[] = [
  {
    v: 1,
    name: "Echo",
    folders: [],
    requests: [
      {
        v: "1",
        endpoint: "https://echo.hoppscotch.io",
        name: "Echo test",
        params: [],
        headers: [],
        method: "GET",
        auth: { authType: "none", authActive: true },
        preRequestScript: "",
        testScript: "",
        body: { contentType: null, body: null },
      },
    ],
  },
]

export const GQL_COLLECTIONS: HoppCollection<HoppGQLRequest>[] = [
  {
    v: 1,
    name: "Echo",
    folders: [],
    requests: [
      {
        v: 2,
        name: "Echo test",
        url: "https://echo.hoppscotch.io/graphql",
        headers: [],
        variables: '{\n  "id": "1"\n}',
        query: "query Request { url }",
        auth: { authType: "none", authActive: true },
      },
    ],
  },
]

export const ENVIRONMENTS: Environment[] = [
  {
    name: "globals",
    variables: [
      {
        key: "test-global-key",
        value: "test-global-value",
      },
    ],
  },
  { name: "Test", variables: [{ key: "test-key", value: "test-value" }] },
]

export const VUEX_DATA: VUEX_DATA = {
  postwoman: {
    settings: { ...DEFAULT_SETTINGS, THEME_COLOR: "purple" },
    collections: REST_COLLECTIONS,
    collectionsGraphql: GQL_COLLECTIONS,
    environments: ENVIRONMENTS,
  },
}

export const REST_HISTORY: RESTHistoryEntry[] = [
  {
    v: 1,
    request: {
      auth: { authType: "none", authActive: true },
      body: { contentType: null, body: null },
      endpoint: "https://echo.hoppscotch.io",
      headers: [],
      method: "GET",
      name: "Untitled",
      params: [],
      preRequestScript: "",
      testScript: "",
      v: "1",
    },
    responseMeta: { duration: 807, statusCode: 200 },
    star: false,
    updatedOn: new Date("2023-11-07T05:27:32.951Z"),
  },
]

export const GQL_HISTORY: GQLHistoryEntry[] = [
  {
    v: 1,
    request: {
      v: 2,
      name: "Untitled",
      url: "https://echo.hoppscotch.io/graphql",
      query: "query Request { url }",
      headers: [],
      variables: "",
      auth: { authType: "none", authActive: true },
    },
    response: '{"data":{"url":"/graphql"}}',
    star: false,
    updatedOn: new Date("2023-11-07T05:28:21.073Z"),
  },
]

export const GQL_TAB_STATE: PersistableTabState<HoppGQLDocument> = {
  lastActiveTabID: "5edbe8d4-65c9-4381-9354-5f1bf05d8ccc",
  orderedDocs: [
    {
      tabID: "5edbe8d4-65c9-4381-9354-5f1bf05d8ccc",
      doc: {
        request: {
          v: 2,
          name: "Untitled",
          url: "https://echo.hoppscotch.io/graphql",
          headers: [],
          variables: '{\n  "id": "1"\n}',
          query: "query Request { url }",
          auth: { authType: "none", authActive: true },
        },
        isDirty: true,
        optionTabPreference: "query",
        response: null,
      },
    },
  ],
}

export const REST_TAB_STATE: PersistableTabState<HoppRESTDocument> = {
  lastActiveTabID: "e6e8d800-caa8-44a2-a6a6-b4765a3167aa",
  orderedDocs: [
    {
      tabID: "e6e8d800-caa8-44a2-a6a6-b4765a3167aa",
      doc: {
        request: {
          v: "1",
          endpoint: "https://echo.hoppscotch.io",
          name: "Echo test",
          params: [],
          headers: [],
          method: "GET",
          auth: { authType: "none", authActive: true },
          preRequestScript: "",
          testScript: "",
          body: { contentType: null, body: null },
        },
        isDirty: false,
        saveContext: {
          originLocation: "user-collection",
          folderPath: "0",
          requestIndex: 0,
        },
        response: null,
      },
    },
  ],
}
