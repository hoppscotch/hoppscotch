import { getDefaultGRPCRequest } from "@hoppscotch/data"
import { nextTick, ref } from "vue"
import { describe, expect, it } from "vitest"
import type { HoppGRPCDocument } from "~/helpers/grpc/document"
import { useGRPCRequestDirtyState } from "../useGRPCRequestDirtyState"

describe("useGRPCRequestDirtyState", () => {
  it("marks scalar, metadata, and proto source edits dirty", async () => {
    const document = ref<HoppGRPCDocument>({
      request: getDefaultGRPCRequest(),
      isDirty: false,
    })

    useGRPCRequestDirtyState(document)

    document.value.request.body = '{ "name": "Hoppscotch" }'
    await nextTick()
    expect(document.value.isDirty).toBe(true)

    document.value.isDirty = false
    document.value.request.metadata.push({
      key: "authorization",
      value: "token",
      active: true,
    })
    await nextTick()
    expect(document.value.isDirty).toBe(true)

    document.value.isDirty = false
    document.value.request.protoFiles.push({
      name: "hello.proto",
      content: 'syntax = "proto3";',
    })
    await nextTick()
    expect(document.value.isDirty).toBe(true)
  })

  it("does not traverse proto source contents while the body is typed", async () => {
    let protoContentReads = 0
    const protoFile = {
      name: "large.proto",
      get content() {
        protoContentReads += 1
        return 'syntax = "proto3";'
      },
    }
    const request = getDefaultGRPCRequest()
    request.protoFiles = [protoFile]
    const document = ref<HoppGRPCDocument>({
      request,
      isDirty: false,
    })

    useGRPCRequestDirtyState(document)
    const readsAfterWatcherSetup = protoContentReads

    document.value.request.body = "{"
    await nextTick()
    document.value.request.body = '{ "title": "" }'
    await nextTick()

    expect(document.value.isDirty).toBe(true)
    expect(protoContentReads).toBe(readsAfterWatcherSetup)
  })
})
