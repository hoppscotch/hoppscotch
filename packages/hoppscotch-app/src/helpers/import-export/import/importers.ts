import HoppRESTCollImporter from "./hopp"
import OpenAPIImporter from "./openapi"
import PostmanImporter from "./postman"
import InsomniaImporter from "./insomnia"
import GistImporter from "./gist"
import MyCollectionsImporter from "./myCollections"

export const RESTCollectionImporters = [
  HoppRESTCollImporter,
  OpenAPIImporter,
  PostmanImporter,
  InsomniaImporter,
  GistImporter,
  MyCollectionsImporter,
] as const

export const URLImporters = [
  HoppRESTCollImporter,
  OpenAPIImporter,
  PostmanImporter,
  InsomniaImporter,
] as const
