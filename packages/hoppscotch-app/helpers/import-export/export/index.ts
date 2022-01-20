import * as TE from "fp-ts/TaskEither"
import { HoppRESTRequest, HoppCollection } from "@hoppscotch/data"

export type HoppExporter<T> = (content: T) => TE.TaskEither<string, string>

export type HoppExporterDefintion<T> = {
  name: string
  exporter: () => Promise<HoppExporter<T>>
}

export const RESTCollectionExporters: HoppExporterDefintion<
  HoppCollection<HoppRESTRequest>
>[] = [
  {
    name: "Hoppscotch REST Collection JSON",
    exporter: () => import("./hopp").then((m) => m.default),
  },
]
