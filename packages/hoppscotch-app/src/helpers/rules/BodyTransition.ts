/**
 * Defines how body should be updated for movement between different
 * content-types
 */

import { pipe } from "fp-ts/function"
import * as A from "fp-ts/Array"
import {
  FormDataKeyValue,
  HoppRESTReqBody,
  ValidContentTypes,
  parseRawKeyValueEntries,
  rawKeyValueEntriesToString,
  RawKeyValueEntry,
} from "@hoppscotch/data"

const ANY_TYPE = Symbol("TRANSITION_RULESET_IGNORE_TYPE")
// eslint-disable-next-line no-redeclare
type ANY_TYPE = typeof ANY_TYPE

type BodyType<T extends ValidContentTypes | null | ANY_TYPE> =
  T extends ValidContentTypes
    ? HoppRESTReqBody & { contentType: T }
    : HoppRESTReqBody

type TransitionDefinition<
  FromType extends ValidContentTypes | null | ANY_TYPE,
  ToType extends ValidContentTypes | null | ANY_TYPE
> = {
  from: FromType
  to: ToType
  definition: (
    currentBody: BodyType<FromType>,
    targetType: BodyType<ToType>["contentType"]
  ) => BodyType<ToType>
}

const rule = <
  FromType extends ValidContentTypes | null | ANY_TYPE,
  ToType extends ValidContentTypes | null | ANY_TYPE
>(
  input: TransitionDefinition<FromType, ToType>
) => input

// Use ANY_TYPE to ignore from/dest type
// Rules apply from top to bottom
const transitionRuleset = [
  rule({
    from: null,
    to: "multipart/form-data",
    definition: () => ({
      contentType: "multipart/form-data",
      body: [],
    }),
  }),
  rule({
    from: ANY_TYPE,
    to: null,
    definition: () => ({
      contentType: null,
      body: null,
    }),
  }),
  rule({
    from: null,
    to: ANY_TYPE,
    definition: (_, targetType) => ({
      contentType: targetType as unknown as Exclude<
        // This is guaranteed by the above rules, we just can't tell TS this
        ValidContentTypes,
        "multipart/form-data"
      >,
      body: "",
    }),
  }),
  rule({
    from: "multipart/form-data",
    to: "application/x-www-form-urlencoded",
    definition: (currentBody, targetType) => ({
      contentType: targetType,
      body: pipe(
        currentBody.body,
        A.map(
          ({ key, value, isFile, active }) =>
            <RawKeyValueEntry>{
              key,
              value: isFile ? "" : value,
              active,
            }
        ),
        rawKeyValueEntriesToString
      ),
    }),
  }),
  rule({
    from: "application/x-www-form-urlencoded",
    to: "multipart/form-data",
    definition: (currentBody, targetType) => ({
      contentType: targetType,
      body: pipe(
        currentBody.body,
        parseRawKeyValueEntries,
        A.map(
          ({ key, value, active }) =>
            <FormDataKeyValue>{
              key,
              value,
              active,
              isFile: false,
            }
        )
      ),
    }),
  }),
  rule({
    from: ANY_TYPE,
    to: "multipart/form-data",
    definition: () => ({
      contentType: "multipart/form-data",
      body: [],
    }),
  }),
  rule({
    from: "multipart/form-data",
    to: ANY_TYPE,
    definition: (_, target) => ({
      contentType: target as Exclude<ValidContentTypes, "multipart/form-data">,
      body: "",
    }),
  }),
  rule({
    from: "application/x-www-form-urlencoded",
    to: ANY_TYPE,
    definition: (_, target) => ({
      contentType: target as Exclude<ValidContentTypes, "multipart/form-data">,
      body: "",
    }),
  }),
  rule({
    from: ANY_TYPE,
    to: "application/x-www-form-urlencoded",
    definition: () => ({
      contentType: "application/x-www-form-urlencoded",
      body: "",
    }),
  }),
  rule({
    from: ANY_TYPE,
    to: ANY_TYPE,
    definition: (curr, targetType) => ({
      contentType: targetType as Exclude<
        // Above rules ensure this will be the case
        ValidContentTypes,
        "multipart/form-data" | "application/x-www-form-urlencoded"
      >,
      // Again, above rules ensure this will be the case, can't convince TS tho
      body: (
        curr as HoppRESTReqBody & {
          contentType: Exclude<
            ValidContentTypes,
            "multipart/form-data" | "application/x-www-form-urlencoded"
          >
        }
      ).body,
    }),
  }),
] as const

export const applyBodyTransition = <T extends ValidContentTypes | null>(
  current: HoppRESTReqBody,
  target: T
): HoppRESTReqBody & { contentType: T } => {
  if (current.contentType === target) {
    console.warn(
      `Tried to transition body from and to the same content-type '${target}'`
    )
    return current as any
  }

  const transitioner = transitionRuleset.find(
    (def) =>
      (def.from === current.contentType || def.from === ANY_TYPE) &&
      (def.to === target || def.to === ANY_TYPE)
  )

  if (!transitioner) {
    throw new Error("Body Type Transition Ruleset is invalid :(")
  }

  // TypeScript won't be able to figure this out easily :(
  return (transitioner.definition as any)(current, target)
}
