import { getDefaultGRPCRequest } from "@hoppscotch/data"
import * as E from "fp-ts/Either"
import { ref } from "vue"
import { describe, expect, it, vi } from "vitest"
import type { HoppGRPCDocument } from "~/helpers/grpc/document"

const interceptor = vi.hoisted(() => ({
  execute: vi.fn(),
  current: {
    value: {
      capabilities: {
        content: new Set(["binary"]),
        advanced: new Set(["http2"]),
      },
    },
  },
}))
const executeMock = interceptor.execute

vi.mock("dioc/vue", () => ({
  useService: () => interceptor,
}))

vi.mock("~/helpers/utils/environments", () => ({
  getCombinedEnvVariables: () => ({
    temp: [],
    selected: [],
    global: [],
  }),
}))

import { useGRPCRequest } from "../useGRPCRequest"

const PROTO = `
syntax = "proto3";
package echo.v1;
message EchoRequest { string message = 1; }
message EchoResponse { string message = 1; }
service EchoService { rpc Echo(EchoRequest) returns (EchoResponse); }
`

describe("useGRPCRequest", () => {
  it("allows another invocation while cancellation is still settling", async () => {
    let resolveExecution:
      ((result: E.Either<"cancellation", never>) => void) | undefined
    const response = new Promise<E.Either<"cancellation", never>>((resolve) => {
      resolveExecution = resolve
    })
    let resolveCancellation: (() => void) | undefined
    const cancellation = new Promise<void>((resolve) => {
      resolveCancellation = resolve
    })
    const cancel = vi.fn(() => cancellation)
    executeMock.mockReturnValueOnce({ cancel, response }).mockReturnValueOnce({
      cancel: vi.fn(async () => {}),
      response: Promise.resolve(E.left("cancellation")),
    })

    const request = getDefaultGRPCRequest()
    request.protoFiles = [{ name: "echo.proto", content: PROTO }]
    const document = ref<HoppGRPCDocument>({
      request,
      isDirty: false,
    })
    const grpc = useGRPCRequest(document)

    await vi.waitFor(() => {
      expect(grpc.services.value).toHaveLength(1)
      expect(document.value.request.method).toBe("Echo")
    })

    const firstSend = grpc.send()
    expect(document.value.error).toBeNull()
    expect(executeMock).toHaveBeenCalledOnce()
    expect(grpc.isLoading.value).toBe(true)

    const cancellationRequest = grpc.cancel()
    expect(cancel).toHaveBeenCalledOnce()
    expect(grpc.isLoading.value).toBe(false)

    const secondSend = grpc.send()
    expect(executeMock).toHaveBeenCalledTimes(2)

    resolveCancellation?.()
    await cancellationRequest
    await secondSend

    resolveExecution?.(E.left("cancellation"))
    await firstSend

    expect(grpc.isLoading.value).toBe(false)
    expect(document.value.response).toBeNull()
    expect(document.value.error).toBeNull()
  })
})
