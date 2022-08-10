import { HoppRESTRequest } from "@hoppscotch/data"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import { HoppExporter } from "."
import { jsonToBlob } from "~/helpers/functional/json"

const exporter: HoppExporter<HoppRESTRequest, never> = (content) =>
  pipe(content, jsonToBlob, TE.right)

export default exporter
