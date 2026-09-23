const DATA_FRAME = 0x00
const COMPRESSED_FRAME = 0x01
const HEADER_SIZE = 5

export type ParsedGRPCResponse = {
  messages: Uint8Array[]
}

export const frameGRPCMessage = (message: Uint8Array): Uint8Array => {
  const frame = new Uint8Array(HEADER_SIZE + message.byteLength)
  const view = new DataView(frame.buffer)
  frame[0] = DATA_FRAME
  view.setUint32(1, message.byteLength, false)
  frame.set(message, HEADER_SIZE)
  return frame
}

export function parseGRPCResponse(body: Uint8Array): ParsedGRPCResponse {
  const messages: Uint8Array[] = []
  let offset = 0

  while (offset < body.byteLength) {
    if (body.byteLength - offset < HEADER_SIZE) {
      throw new Error("Incomplete gRPC frame header")
    }

    const flags = body[offset]
    const length = new DataView(
      body.buffer,
      body.byteOffset + offset + 1,
      4
    ).getUint32(0, false)
    const payloadStart = offset + HEADER_SIZE
    const payloadEnd = payloadStart + length

    if (payloadEnd > body.byteLength) {
      throw new Error("Incomplete gRPC frame payload")
    }

    const payload = body.slice(payloadStart, payloadEnd)
    if ((flags & COMPRESSED_FRAME) === COMPRESSED_FRAME) {
      throw new Error("Compressed gRPC responses are not supported yet")
    }
    if (flags !== DATA_FRAME)
      throw new Error(`Unsupported gRPC frame: ${flags}`)
    messages.push(payload)

    offset = payloadEnd
  }

  return { messages }
}
