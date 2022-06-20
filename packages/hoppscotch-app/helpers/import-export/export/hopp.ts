import { HoppRESTRequest } from "@hoppscotch/data"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import { HoppExporter } from "."
import { jsonToBlob } from "~/helpers/utils/export"

const exporter: HoppExporter<HoppRESTRequest, "CANNOT_MAKE_BLOB"> = (content) =>
  pipe(content, jsonToBlob, TE.fromEither)

export default exporter
