import HoppRESTCollImporter from "./hopp"
import OpenAPIImporter from "./openapi"
import PostmanImporter from "./postman"
import InsomniaImporter from "./insomnia"

export const RESTCollectionImporters = [
  HoppRESTCollImporter,
  OpenAPIImporter,
  PostmanImporter,
  InsomniaImporter,
] as const
