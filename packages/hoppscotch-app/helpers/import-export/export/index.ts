import * as TE from "fp-ts/TaskEither"
import * as A from "fp-ts/Array"
import * as O from "fp-ts/Option"
import { pipe } from "fp-ts/function"
import {
  HoppRESTRequest,
  HoppCollection,
  HoppGQLRequest,
} from "@hoppscotch/data"

export type ExportError = "INVALID_EXPORTER" | "IMPORT_ERROR"

export type HoppExporter<
  ReqType extends HoppRESTRequest | HoppGQLRequest,
  ErrorType extends string
> = (
  collections: Array<HoppCollection<ReqType>>
) => TE.TaskEither<ErrorType, Blob>

export const RESTCollectionExporters = [
  {
    id: "hopp",
    name: "export.hopp_export_name",
    icon: "download",
    title: "export.hopp_export_title",
    exporter: () => import("./hopp").then((m) => m.default),
  },
  {
    id: "openapi",
    name: "export.openapi_export_name",
    icon: "download",
    title: "export.openapi_export_title",
    exporter: () => import("./openapi").then((m) => m.default),
  },
]

export const exportCollection =
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
      TE.chainW((exporter) => exporter(collections))
    )

type _RESTCollectionExporter = typeof RESTCollectionExporters extends Array<
  infer Exporter
>
  ? Exporter
  : never

export type RESTCollectionExporterError =
  | (_RESTCollectionExporter["exporter"] extends () => Promise<
      HoppExporter<HoppRESTRequest, infer ErrorType>
    >
      ? ErrorType
      : never)
  | ExportError
