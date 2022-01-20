import { HoppGQLRequest, translateToGQLRequest } from "../graphql";
import { HoppRESTRequest, translateToNewRequest } from "../rest";

const CURRENT_COLL_SCHEMA_VER = 1

type SupportedReqTypes =
  | HoppRESTRequest
  | HoppGQLRequest

export type HoppCollection<T extends SupportedReqTypes> = {
  v: number
  name: string
  folders: HoppCollection<T>[]
  requests: T[]

  id?: string // For Firestore ID data
}

/**
 * Generates a Collection object. This ignores the version number object
 * so it can be incremented independently without updating it everywhere
 * @param x The Collection Data
 * @returns The final collection
 */
export function makeCollection<T extends SupportedReqTypes>(
  x: Omit<HoppCollection<T>, "v">
): HoppCollection<T> {
  return {
    v: CURRENT_COLL_SCHEMA_VER,
    ...x
  }
}

/**
 * Translates an old collection to a new collection
 * @param x The collection object to load
 * @returns The proper new collection format
 */
export function translateToNewRESTCollection(
  x: any
): HoppCollection<HoppRESTRequest> {
  if (x.v && x.v === 1) return x

  // Legacy
  const name = x.name ?? "Untitled"
  const folders = (x.folders ?? []).map(translateToNewRESTCollection)
  const requests = (x.requests ?? []).map(translateToNewRequest)

  const obj = makeCollection<HoppRESTRequest>({
    name,
    folders,
    requests,
  })

  if (x.id) obj.id = x.id

  return obj
}

/**
 * Translates an old collection to a new collection
 * @param x The collection object to load
 * @returns The proper new collection format
 */
export function translateToNewGQLCollection(
  x: any
): HoppCollection<HoppGQLRequest> {
  if (x.v && x.v === 1) return x

  // Legacy
  const name = x.name ?? "Untitled"
  const folders = (x.folders ?? []).map(translateToNewGQLCollection)
  const requests = (x.requests ?? []).map(translateToGQLRequest)

  const obj = makeCollection<HoppGQLRequest>({
    name,
    folders,
    requests,
  })

  if (x.id) obj.id = x.id

  return obj
}

