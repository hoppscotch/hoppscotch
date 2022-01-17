import * as TE from "fp-ts/TaskEither"
import { HoppRESTRequest } from "@hoppscotch/data"
import { Collection } from "~/newstore/collections"

export type HoppExporter<T> = (content: T) => TE.TaskEither<string, string>

export type HoppExporterDefintion<T> = {
  name: string
  exporter: () => Promise<HoppExporter<T>>
}

export const RESTCollectionExporters: HoppExporterDefintion<
  Collection<HoppRESTRequest>
>[] = [
  {
    name: "Hoppscotch REST Collection JSON",
    exporter: () => import("./hopp").then((m) => m.default),
  },
]
