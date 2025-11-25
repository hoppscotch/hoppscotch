import { InferredEntity, createVersionedEntity } from "verzod"

import V1_VERSION from "./v/1"
import V2_VERSION from "./v/2"
import V3_VERSION from "./v/3"
import V4_VERSION from "./v/4"
import V5_VERSION from "./v/5"
import V6_VERSION from "./v/6"
import V7_VERSION from "./v/7"
import V8_VERSION from "./v/8"
import V9_VERSION from "./v/9"
import V10_VERSION from "./v/10"

export { CollectionVariable } from "./v/10"

import { z } from "zod"
import { translateToNewRequest } from "../rest"
import { translateToGQLRequest } from "../graphql"
import { generateUniqueRefId } from "../utils/collection"

const versionedObject = z.object({
  v: z.number(),
})

export const HoppCollection = createVersionedEntity({
  latestVersion: 10,
  versionMap: {
    1: V1_VERSION,
    2: V2_VERSION,
    3: V3_VERSION,
    4: V4_VERSION,
    5: V5_VERSION,
    6: V6_VERSION,
    7: V7_VERSION,
    8: V8_VERSION,
    9: V9_VERSION,
    10: V10_VERSION,
  },
  getVersion(data) {
    const versionCheck = versionedObject.safeParse(data)

    if (versionCheck.success) return versionCheck.data.v

    // For V1 we have to check the schema
    const result = V1_VERSION.schema.safeParse(data)

    return result.success ? 1 : null
  },
})

export type HoppCollection = InferredEntity<typeof HoppCollection>

export type HoppCollectionVariable = InferredEntity<
  typeof HoppCollection
>["variables"][number]

export const CollectionSchemaVersion = 10

/**
 * Generates a Collection object. This ignores the version number object
 * @param x The Collection Data
 * @returns The final collection
 */
export function makeCollection(x: Omit<HoppCollection, "v">): HoppCollection {
  return {
    v: CollectionSchemaVersion,
    ...x,
    _ref_id: x._ref_id ? x._ref_id : generateUniqueRefId("coll"),
  }
}

/**
 * Translates an old collection to a new collection
 * @param x The collection object to load
 * @returns The proper new collection format
 */
export function translateToNewRESTCollection(x: any): HoppCollection {
  // Legacy
  const name = x.name ?? "Untitled"
  const folders = (x.folders ?? []).map(translateToNewRESTCollection)
  const requests = (x.requests ?? []).map(translateToNewRequest)

  const auth = x.auth ?? { authType: "inherit", authActive: true }
  const headers = x.headers ?? []
  const variables = x.variables ?? []

  const obj = makeCollection({
    name,
    folders,
    requests,
    auth,
    headers,
    variables,
  })

  if (x.id) obj.id = x.id
  if (x._ref_id) obj._ref_id = x._ref_id

  return obj
}

/**
 * Translates an old collection to a new collection
 * @param x The collection object to load
 * @returns The proper new collection format
 */
export function translateToNewGQLCollection(x: any): HoppCollection {
  // Legacy
  const name = x.name ?? "Untitled"
  const folders = (x.folders ?? []).map(translateToNewGQLCollection)
  const requests = (x.requests ?? []).map(translateToGQLRequest)

  const auth = x.auth ?? { authType: "inherit", authActive: true }
  const headers = x.headers ?? []
  const variables = x.variables ?? []

  const obj = makeCollection({
    name,
    folders,
    requests,
    auth,
    headers,
    variables,
  })

  if (x.id) obj.id = x.id
  if (x._ref_id) obj._ref_id = x._ref_id

  return obj
}
