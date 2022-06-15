import * as TE from "fp-ts/TaskEither"
import * as A from "fp-ts/Array"
import * as O from "fp-ts/Option"
import { pipe } from "fp-ts/function"
import { HoppRESTRequest, HoppCollection } from "@hoppscotch/data"
import { OpenAPIV3 } from "openapi-types"
import { HoppToOpenAPIConversionErrors } from "./openapi"

type ExportErrors = "INVALID_EXPORTER" | "IMPORT_ERROR"

export type HoppExporter<T> = (
  content: T
) => TE.TaskEither<
  ExportErrors | HoppToOpenAPIConversionErrors,
  HoppCollection<HoppRESTRequest>[] | OpenAPIV3.Document
>

export type HoppExporterDefinition<T> = {
  id: string
  name: string
  icon: string
  title: string
  label: string
  exporter: () => Promise<HoppExporter<T>>
}

export const RESTCollectionExporters: HoppExporterDefinition<
  HoppCollection<HoppRESTRequest>[]
>[] = [
  {
    id: "hopp",
    name: "export.hopp_export_name",
    icon: "download",
    title: "export.hopp_export_title",
    label: "export.hopp_export_label",
    exporter: () => import("./hopp").then((m) => m.default),
  },
  {
    id: "openapi",
    name: "export.openapi_export_name",
    icon: "download",
    title: "export.openapi_export_title",
    label: "export.openapi_export_label",
    exporter: () => import("./openapi").then((m) => m.default),
  },
]

export const getDataToWrite =
  (exporterId: string) => (collections: HoppCollection<HoppRESTRequest>[]) =>
    pipe(
      RESTCollectionExporters,
      A.findFirst((exporter) => exporter.id === exporterId),
      O.map(({ exporter }) => exporter),
      TE.fromOption(() => "INVALID_EXPORTER" as const),
      TE.chainW((getExporter) =>
        TE.tryCatch(
          () => getExporter(),
          () => "IMPORT_ERROR" as const
        )
      ),
      TE.chain((exporter) => exporter(collections))
    )
