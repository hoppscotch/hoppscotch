import * as t from 'io-ts';

interface EmailBrand {
  readonly Email: unique symbol;
}

// The validation branded type for an email
export const EmailCodec = t.brand(
  t.string,
  (x): x is t.Branded<string, EmailBrand> =>
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
      x,
    ),
  'Email',
);

export type Email = t.TypeOf<typeof EmailCodec>;
