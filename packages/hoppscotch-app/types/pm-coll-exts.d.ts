import "postman-collection"

/*
  There are some small mismatches in some types that the 'postman-collection'
  package provides (come on guys ;) ). These type definitions append extra
  information which is present in the runtime values of the types
*/

type PMRawLanguage = "text" | "javascript" | "json" | "html" | "xml"

declare module "postman-collection" {
  interface RequestBody {
    // Options is not well-defined by the schema, so we are treating everything as optional for runtime safety.
    // See: https://schema.postman.com/collection/json/v2.1.0/draft-04/collection.json
    options?: {
      raw?: {
        language?: PMRawLanguage
      }
    }
  }

  interface FormParam {
    type: "file" | "text"
  }
}
