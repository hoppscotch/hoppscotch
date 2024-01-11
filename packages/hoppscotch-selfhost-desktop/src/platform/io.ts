import { IOPlatformDef } from "@hoppscotch/common/platform/io"
import { save } from "@tauri-apps/api/dialog"
import { open } from "@tauri-apps/api/shell"
import { writeBinaryFile, writeTextFile } from "@tauri-apps/api/fs"

export const ioDef: IOPlatformDef = {
  async saveFileWithDialog(opts) {
    const path = await save({
      filters: opts.filters,
      defaultPath: opts.suggestedFilename,
    })

    if (path === null) {
      return { type: "cancelled" }
    }

    if (typeof opts.data === "string") {
      await writeTextFile(path, opts.data)
    } else {
      await writeBinaryFile(path, opts.data)
    }

    return { type: "saved", path }
  },
  openExternalLink(url) {
    return open(url)
  },
}
