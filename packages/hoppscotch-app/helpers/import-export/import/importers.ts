import HoppRESTCollImporter from "./hopp"
import OpenAPIImporter from "./openapi"

export const RESTCollectionImporters = [
  HoppRESTCollImporter,
  OpenAPIImporter,
] as const
