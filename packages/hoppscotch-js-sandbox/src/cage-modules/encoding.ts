import {
  defineCageModule,
  defineSandboxFunctionRaw,
  encoding,
} from "faraday-cage/modules"
import { marshalValue } from "./utils/vm-marshal"

/**
 * `TextEncoder` / `TextDecoder` for the sandbox.
 *
 * faraday-cage's `encoding()` module returns the result of `TextEncoder#encode()` through a
 * marshaller that only recognises plain arrays, so the host `Uint8Array` reaches the sandbox as an
 * object with numeric keys and no `length`. Anything that reads the bytes by length, such as
 * `crypto.subtle.digest()` or `crypto.subtle.importKey()`, then sees zero bytes.
 *
 * This keeps faraday-cage's polyfill and replaces `encode()` so that it returns a real
 * `Uint8Array` inside the sandbox.
 */
export const customEncodingModule = () =>
  defineCageModule((ctx) => {
    encoding().def(ctx)

    const textEncoder = new TextEncoder()

    const hostEncode = defineSandboxFunctionRaw(
      ctx,
      "__hostTextEncoderEncodeBytes",
      (input) => marshalValue(ctx, textEncoder.encode(ctx.vm.getString(input)))
    )

    const patchEncode = ctx.scope
      .manage(
        ctx.vm.evalCode(`
          (function (hostEncode) {
            TextEncoder.prototype.encode = function (input) {
              return new Uint8Array(
                hostEncode(input === undefined ? "" : String(input))
              )
            }
          })
        `)
      )
      .unwrap()

    ctx.scope.manage(
      ctx.vm.callFunction(patchEncode, ctx.vm.undefined, hostEncode)
    )
  })
