import { watch, type Ref } from "vue"
import type { HoppGRPCDocument } from "~/helpers/grpc/document"

/**
 * Tracks gRPC request edits without deep-watching the complete request.
 *
 * Proto sources can be substantially larger than the other request fields.
 * Keeping their deep watcher separate prevents every body keystroke from
 * traversing proto files.
 */
export function useGRPCRequestDirtyState(
  document: Ref<HoppGRPCDocument>
): void {
  const markDirty = () => {
    if (!document.value.isDirty) document.value.isDirty = true
  }

  watch(() => {
    const request = document.value.request

    return [
      request.v,
      request.name,
      request.url,
      request.service,
      request.method,
      request.body,
    ] as const
  }, markDirty)

  watch(() => document.value.request.metadata, markDirty, { deep: true })
  watch(() => document.value.request.protoFiles, markDirty, { deep: true })
}
