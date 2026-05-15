import { IOPlatformDef } from "../io"
import { pipe } from "fp-ts/function"
import * as S from "fp-ts/string"
import * as RNEA from "fp-ts/ReadonlyNonEmptyArray"

/**
 * Implementation for how to handle IO operations in the browser.
 */
export const browserIODef: IOPlatformDef = {
  saveFileWithDialog(opts) {
    // Ensure binary data is properly handled as Uint8Array for Blob construction
    const blobData =
      typeof opts.data === "string"
        ? opts.data
        : opts.data instanceof Uint8Array
          ? opts.data
          : new Uint8Array(opts.data as ArrayBuffer)
    const file = new Blob([blobData as any], { type: opts.contentType })
    const a = document.createElement("a")
    const url = URL.createObjectURL(file)

    a.href = url
    a.download =
      opts.suggestedFilename ??
      pipe(
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
  openExternalLink(url) {
    window.open(url, "_blank")

    // Browsers provide no way for us to know the open went successfully.
    return Promise.resolve()
  },
}
