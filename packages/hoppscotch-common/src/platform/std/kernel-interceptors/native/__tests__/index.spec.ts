import * as E from "fp-ts/Either"
import type { RelayRequest } from "@hoppscotch/kernel"
import { describe, expect, it, vi } from "vitest"

import { NativeKernelInterceptorService } from ".."

describe("NativeKernelInterceptorService", () => {
  it("cancels an execution when cancellation is requested during setup", async () => {
    const service = Object.create(
      NativeKernelInterceptorService.prototype
    ) as NativeKernelInterceptorService
    const relayCancel = vi.fn(() => Promise.resolve())

    let finishSetup: () => void = () => {}
    const setupPending = new Promise<void>((resolve) => {
      finishSetup = resolve
    })

    vi.spyOn(service as any, "executeRequest").mockImplementation(
      async (_request, setRelayExecution) => {
        await setupPending
        await setRelayExecution({ cancel: relayCancel })
        return E.left({ kind: "abort", message: "Request cancelled" })
      }
    )

    const execution = service.execute({} as RelayRequest)

    await execution.cancel()
    expect(relayCancel).not.toHaveBeenCalled()

    finishSetup()
    await execution.response

    expect(relayCancel).toHaveBeenCalledOnce()

    await execution.cancel()
    expect(relayCancel).toHaveBeenCalledOnce()
  })
})
