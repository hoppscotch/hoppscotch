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
import V11_VERSION from "./v/11"
import V12_VERSION from "./v/12"

export { CollectionVariable } from "./v/10"

import { z } from "zod"
import { translateToNewRequest } from "../rest"
import { translateToGQLRequest } from "../graphql"
import { generateUniqueRefId } from "../utils/collection"

const versionedObject = z.object({
  v: z.number(),
})

export const HoppCollection = createVersionedEntity({
  latestVersion: 12,
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
    11: V11_VERSION,
    12: V12_VERSION,
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

export const CollectionSchemaVersion = 12

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
 * Shared collection migration logic.
 * Extracted to eliminate duplication between REST and GQL collection translators.
 * The only difference between them is which request translator function is used.
 *
 * @param x The collection object to migrate
 * @param requestTranslator The function to translate individual requests (REST or GQL)
 * @param folderTranslator The recursive function for nested folders (passes itself)
 * @returns The properly migrated collection
 */
function translateToNewCollection(
  x: any,
  requestTranslator: (r: any) => any,
  folderTranslator: (x: any) => HoppCollection
): HoppCollection {
  const name = x.name ?? "Untitled"
  const folders = (x.folders ?? []).map(folderTranslator)
  const requests = (x.requests ?? []).map(requestTranslator)

  const auth = x.auth ?? { authType: "inherit", authActive: true }
  const headers = x.headers ?? []
  const variables = x.variables ?? []

  const description = x.description ?? null

  const preRequestScript = x.preRequestScript ?? ""
  const testScript = x.testScript ?? ""

  const obj = makeCollection({
    name,
    folders,
    requests,
    auth,
    headers,
    variables,
    description,
    preRequestScript,
    testScript,
  })

  if (x.id) obj.id = x.id
  if (x._ref_id) {
    obj._ref_id = x._ref_id
  }

  return obj
}

/**
 * Translates an old REST collection to a new collection
 * @param x The collection object to load
 * @returns The proper new collection format
 */
export function translateToNewRESTCollection(x: any): HoppCollection {
  return translateToNewCollection(x, translateToNewRequest, translateToNewRESTCollection)
}

/**
 * Translates an old GQL collection to a new collection
 * @param x The collection object to load
 * @returns The proper new collection format
 */
export function translateToNewGQLCollection(x: any): HoppCollection {
  return translateToNewCollection(x, translateToGQLRequest, translateToNewGQLCollection)
}
