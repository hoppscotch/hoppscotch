import * as t from "io-ts"

const emailRegex =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/

interface EmailBrand {
  readonly Email: unique symbol
}

export const EmailCodec = t.brand(
  t.string,
  (x): x is t.Branded<string, EmailBrand> => emailRegex.test(x),
  "Email"
)

export type Email = t.TypeOf<typeof EmailCodec>
