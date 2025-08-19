import { ImportRequest, convert } from "insomnia-importers"
import { Header, Parameter } from "insomnia-importers/dist/src/entities"

type UnwrapPromise<T extends Promise<any>> =
  T extends Promise<infer Y> ? Y : never

export type InsomniaDoc = UnwrapPromise<ReturnType<typeof convert>>
export type InsomniaResource = ImportRequest

// insomnia-importers v3.6.0 doesn't provide a type for path parameters and they have deprecated the library
export type InsomniaPathParameter = {
  name: string
  value: string
}

export type InsomniaFolderResource = ImportRequest & { _type: "request_group" }
export type InsomniaRequestResource = Omit<
  ImportRequest,
  "headers" | "parameters"
> & {
  _type: "request"
} & {
  pathParameters?: InsomniaPathParameter[]
} & {
  headers: (Header & { description: string })[]
  parameters: (Parameter & { description: string })[]
}

/**
 * The provided type by insomnia-importers, this type corrects it
 */
export type InsoReqAuth =
  | { type: "basic"; disabled?: boolean; username?: string; password?: string }
  | {
      type: "oauth2"
      disabled?: boolean
      accessTokenUrl?: string
      authorizationUrl?: string
      clientId?: string
      scope?: string
    }
  | {
      type: "bearer"
      disabled?: boolean
      token?: string
    }

/**
 * Insomnia v5 document types
 * These types are used to represent the structure of Insomnia v5 documents.
 */
export type InsomniaDocV5 = {
  type: `collection.insomnia.rest/${string}`
  name: string
  meta: {
    id: string
    created: number
    modified: number
    description?: string
  }
  collection: (
    | InsomniaFolderV5
    | InsomniaRequestResource
    | InsomniaScriptOnlyV5
  )[]
  cookieJar?: InsomniaCookieJarV5
  environments?: InsomniaEnvironmentV5
}

export type InsomniaMetaV5 = {
  id: string
  created: number
  modified: number
  description?: string
  sortKey?: number
}

export type InsomniaScriptOnlyV5 = {
  name: string
  meta: InsomniaMetaV5
  scripts: {
    afterResponse?: string
    preRequest?: string
  }
}

export type InsomniaFolderV5 = {
  name: string
  meta: InsomniaMetaV5
  children?: (InsomniaFolderV5 | InsomniaRequestResource)[]
  environment?: Record<string, string>
  scripts?: {
    afterResponse?: string
    preRequest?: string
  }
}

export type InsomniaKeyValueV5 = {
  id?: string
  name: string
  value: string
  description?: string
  disabled?: boolean
  type?: string
  multiline?: boolean
}

export type InsomniaCookieJarV5 = {
  name: string
  meta: {
    id: string
    created: number
    modified: number
  }
  cookies: {
    key: string
    value: string
    domain: string
    path: string
    secure?: boolean
    httpOnly?: boolean
    hostOnly?: boolean
    creation: string
    lastAccessed: string
    sameSite?: "lax" | "strict" | "none"
    id: string
  }[]
}

export type InsomniaEnvironmentV5 = {
  name: string
  meta: {
    id: string
    created: number
    modified: number
    isPrivate?: boolean
  }
  data: Record<string, string>
  subEnvironments?: {
    name: string
    meta: {
      id: string
      created: number
      modified: number
      isPrivate?: boolean
      sortKey?: number
    }
    data: Record<string, string>
  }[]
}
