import { HoppRESTRequest, HoppCollection } from "@hoppscotch/data"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import { HoppExporter } from "."

const exporter: HoppExporter<HoppCollection<HoppRESTRequest>[]> = (content) =>
  pipe(content, TE.right)

export default exporter
