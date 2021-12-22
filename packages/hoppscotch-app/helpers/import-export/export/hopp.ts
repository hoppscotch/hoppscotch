import { HoppRESTRequest } from "@hoppscotch/data"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import { HoppExporter } from "."
import { Collection } from "~/newstore/collections"

const exporter: HoppExporter<Collection<HoppRESTRequest>> = (content) =>
  pipe(content, JSON.stringify, TE.right)

export default exporter
