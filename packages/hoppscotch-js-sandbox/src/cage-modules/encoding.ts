import {
  defineCageModule,
  defineSandboxFunctionRaw,
} from "faraday-cage/modules"
import { uint8ArrayToVmArray, vmArrayToUint8Array } from "./utils/vm-marshal"

export type CustomEncodingModuleConfig = {
  textEncoderImpl?: typeof TextEncoder
  textDecoderImpl?: typeof TextDecoder
}

// Bridges the WHATWG TextEncoder/TextDecoder classes into the sandbox.
//
// faraday-cage ships its own `encoding()` module that does the same bridging,
// but its generic value marshaller only special-cases `Array.isArray()`
// values. A `Uint8Array` (what a real `TextEncoder.encode()` returns) fails
// that check, so it falls through to a "plain object" branch that copies the
// indexed bytes but drops `length`/`byteLength` entirely. Any consumer that
// needs to know how many bytes came back (e.g. `crypto.subtle.digest`) ends
// up reading `length` as `undefined` and hashing zero bytes.
//
// This module performs the same encode/decode bridging, but marshals bytes
// with the same helpers the crypto module already relies on, which do
// preserve `byteLength`/real array semantics.
const TEXT_ENCODING_POLYFILL_SRC = `
(function (
  hostTextEncoderEncode,
  hostTextEncoderEncodeInto,
  hostTextDecoderCreate,
  hostTextDecoderDecode
) {
  "use strict";

  function TextEncoder() {}

  Object.defineProperty(TextEncoder.prototype, "encode", {
    value: function (input) {
      if (input === undefined) input = "";
      return hostTextEncoderEncode(String(input));
    },
    writable: true,
    enumerable: false,
    configurable: true,
  });

  Object.defineProperty(TextEncoder.prototype, "encodeInto", {
    value: function (source, destination) {
      if (source === undefined) source = "";
      return hostTextEncoderEncodeInto(String(source), destination);
    },
    writable: true,
    enumerable: false,
    configurable: true,
  });

  Object.defineProperty(TextEncoder.prototype, "encoding", {
    value: "utf-8",
    writable: false,
    enumerable: false,
    configurable: false,
  });

  function TextDecoder(label, options) {
    if (label === undefined) label = "utf-8";
    if (options === undefined) options = {};

    var created = hostTextDecoderCreate(
      label,
      Boolean(options.fatal),
      Boolean(options.ignoreBOM)
    );
    this.__decoderId = created.id;
    this.__encoding = created.encoding;
    this.__fatal = Boolean(options.fatal);
    this.__ignoreBOM = Boolean(options.ignoreBOM);
  }

  Object.defineProperty(TextDecoder.prototype, "decode", {
    value: function (input, options) {
      if (options === undefined) options = {};
      return hostTextDecoderDecode(
        this.__decoderId,
        input,
        Boolean(options.stream)
      );
    },
    writable: true,
    enumerable: false,
    configurable: true,
  });

  Object.defineProperty(TextDecoder.prototype, "encoding", {
    get: function () {
      return this.__encoding;
    },
    enumerable: false,
    configurable: true,
  });

  Object.defineProperty(TextDecoder.prototype, "fatal", {
    get: function () {
      return this.__fatal;
    },
    enumerable: false,
    configurable: true,
  });

  Object.defineProperty(TextDecoder.prototype, "ignoreBOM", {
    get: function () {
      return this.__ignoreBOM;
    },
    enumerable: false,
    configurable: true,
  });

  globalThis.TextEncoder = TextEncoder;
  globalThis.TextDecoder = TextDecoder;
})
`

export const customEncodingModule = (config: CustomEncodingModuleConfig = {}) =>
  defineCageModule((ctx) => {
    const TextEncoderImpl = config.textEncoderImpl ?? globalThis.TextEncoder
    const TextDecoderImpl = config.textDecoderImpl ?? globalThis.TextDecoder

    if (!TextEncoderImpl) {
      throw new Error(
        "TextEncoder is not available in this environment. Please provide a custom implementation via textEncoderImpl."
      )
    }
    if (!TextDecoderImpl) {
      throw new Error(
        "TextDecoder is not available in this environment. Please provide a custom implementation via textDecoderImpl."
      )
    }

    const hostEncoder = new TextEncoderImpl()
    const decoders = new Map<number, InstanceType<typeof TextDecoderImpl>>()
    let nextDecoderId = 1

    // crypto.subtle.digest() and every other byte-array consumer in this
    // sandbox expect the shape produced by uint8ArrayToVmArray (a real VM
    // array with a byteLength prop) - not whatever faraday-cage's generic
    // marshaller happens to produce for a Uint8Array.
    const encodeFn = defineSandboxFunctionRaw(
      ctx,
      "__hostTextEncoderEncode",
      (...args) => {
        const str = (ctx.vm.dump(args[0]) as string | undefined) ?? ""
        const bytes = hostEncoder.encode(String(str))
        return uint8ArrayToVmArray(ctx, bytes)
      }
    )

    // encodeInto writes into a caller-supplied destination array instead of
    // returning a new one. The destination is a VM array (this sandbox
    // represents byte buffers as plain arrays, see vm-marshal.ts), so it's
    // sized via `length` and written back index-by-index, same convention
    // as vmArrayToUint8Array/uint8ArrayToVmArray.
    const encodeIntoFn = defineSandboxFunctionRaw(
      ctx,
      "__hostTextEncoderEncodeInto",
      (...args) => {
        const str = (ctx.vm.dump(args[0]) as string | undefined) ?? ""
        const destHandle = args[1]

        const destLengthHandle = ctx.vm.getProp(destHandle, "length")
        const destLength = ctx.vm.getNumber(destLengthHandle)
        destLengthHandle.dispose()

        const destBuffer = new Uint8Array(destLength)
        const { read, written } = hostEncoder.encodeInto(str, destBuffer)

        for (let i = 0; i < written; i++) {
          ctx.vm.setProp(
            destHandle,
            i,
            ctx.scope.manage(ctx.vm.newNumber(destBuffer[i]))
          )
        }

        const resultObj = ctx.scope.manage(ctx.vm.newObject())
        ctx.vm.setProp(
          resultObj,
          "read",
          ctx.scope.manage(ctx.vm.newNumber(read))
        )
        ctx.vm.setProp(
          resultObj,
          "written",
          ctx.scope.manage(ctx.vm.newNumber(written))
        )
        return resultObj
      }
    )

    // Returns the host TextDecoder's own canonical `encoding` name (e.g.
    // "utf8" -> "utf-8") instead of re-deriving it, so aliases resolve the
    // same way they do in a real TextDecoder.
    const createDecoderFn = defineSandboxFunctionRaw(
      ctx,
      "__hostTextDecoderCreate",
      (...args) => {
        const label = ctx.vm.dump(args[0]) as string
        const fatal = ctx.vm.dump(args[1]) as boolean
        const ignoreBOM = ctx.vm.dump(args[2]) as boolean

        try {
          const decoder = new TextDecoderImpl(label, { fatal, ignoreBOM })
          const id = nextDecoderId++
          decoders.set(id, decoder)

          const resultObj = ctx.scope.manage(ctx.vm.newObject())
          ctx.vm.setProp(
            resultObj,
            "id",
            ctx.scope.manage(ctx.vm.newNumber(id))
          )
          ctx.vm.setProp(
            resultObj,
            "encoding",
            ctx.scope.manage(ctx.vm.newString(decoder.encoding))
          )
          return resultObj
        } catch (e) {
          throw e instanceof Error ? e : new Error(String(e))
        }
      }
    )

    const decodeFn = defineSandboxFunctionRaw(
      ctx,
      "__hostTextDecoderDecode",
      (...args) => {
        const id = ctx.vm.dump(args[0]) as number
        const inputHandle = args[1]
        const stream = ctx.vm.dump(args[2]) as boolean

        const decoder = decoders.get(id)
        if (!decoder) {
          throw new Error("Invalid TextDecoder instance")
        }

        const bytes =
          inputHandle && ctx.vm.typeof(inputHandle) !== "undefined"
            ? vmArrayToUint8Array(ctx, inputHandle)
            : undefined

        const result = decoder.decode(bytes, { stream })
        return ctx.scope.manage(ctx.vm.newString(result))
      }
    )

    const polyfillFn = ctx.scope.manage(
      ctx.vm.unwrapResult(ctx.vm.evalCode(TEXT_ENCODING_POLYFILL_SRC))
    )

    ctx.vm.unwrapResult(
      ctx.vm.callFunction(
        polyfillFn,
        ctx.vm.undefined,
        encodeFn,
        encodeIntoFn,
        createDecoderFn,
        decodeFn
      )
    )
  })
