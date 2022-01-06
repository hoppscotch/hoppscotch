import HoppRESTCollImporter from "./hopp"
import NewOpenAPIImporter from "./newopenapi"

export const RESTCollectionImporters = [
  HoppRESTCollImporter,
  NewOpenAPIImporter,
] as const
