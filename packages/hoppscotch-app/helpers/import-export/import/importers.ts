import HoppRESTCollImporter from "./hopp"
import OpenAPIImporter from "./openapi"
import PostmanImporter from "./postman"
import InsomniaImporter from "./insomnia"
import GistImporter from "./gist"

export const RESTCollectionImporters = [
  HoppRESTCollImporter,
  OpenAPIImporter,
  PostmanImporter,
  InsomniaImporter,
  GistImporter,
] as const
