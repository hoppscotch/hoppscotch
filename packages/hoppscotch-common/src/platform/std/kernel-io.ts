import { KernelIO } from "~/platform/kernel-io"
import { Io } from "~/kernel/io"

export const kernelIO: KernelIO = {
  saveFileWithDialog(opts) {
    return Io.saveFileWithDialog(opts)
  },
  openExternalLink(opts) {
    return Io.openExternalLink(opts)
  },
}
