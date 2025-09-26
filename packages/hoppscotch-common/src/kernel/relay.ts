import type {
  RelayRequest,
  RelayRequestEvents,
  RelayError,
  RelayResponse,
  RelayEventEmitter,
} from "@hoppscotch/kernel"
import * as E from "fp-ts/Either"
import { getModule } from "."

export const Relay = (() => {
  const module = () => getModule("relay")

  return {
    capabilities: () => module().capabilities,
    canHandle: (request: RelayRequest): E.Either<RelayError, true> =>
      module().canHandle(request),
    execute: (
      request: RelayRequest
    ): {
      cancel: () => Promise<void>
      emitter: RelayEventEmitter<RelayRequestEvents>
      response: Promise<E.Either<RelayError, RelayResponse>>
    } => {
      // DEBUG: Log the actual relay module being used
      const relayModule = module();

      const result = relayModule.execute(request);

      return result;
    },
  } as const
})()
