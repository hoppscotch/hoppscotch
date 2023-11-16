import { IOPlatformDef } from "../io"
import { pipe } from "fp-ts/function"
import * as S from "fp-ts/string"
import * as RNEA from "fp-ts/ReadonlyNonEmptyArray"

/**
 * Implementation for how to handle IO operations in the browser.
 */
export const browserIODef: IOPlatformDef = {
  saveFileWithDialog(opts) {
    const file = new Blob([opts.data], { type: opts.contentType })
    const a = document.createElement("a")
    const url = URL.createObjectURL(file)

    a.href = url
    a.download = pipe(
      url,
      S.split("/"),
      RNEA.last,
      S.split("#"),
      RNEA.head,
      S.split("?"),
      RNEA.head
    )

    document.body.appendChild(a)
    a.click()

    setTimeout(() => {
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 1000)

    // Browsers provide no way for us to know the save went successfully.
    return Promise.resolve({ type: "unknown" })
  },
}
