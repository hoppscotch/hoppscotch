import {
  Environment,
  HoppRESTRequest,
  parseBodyEnvVariablesE,
  parseRawKeyValueEntriesE,
  parseTemplateString,
  parseTemplateStringE,
} from "@hoppscotch/data";
import { runPreRequestScript } from "@hoppscotch/js-sandbox/node";
import * as A from "fp-ts/Array";
import * as E from "fp-ts/Either";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import * as TE from "fp-ts/TaskEither";
import { flow, pipe } from "fp-ts/function";
import * as S from "fp-ts/string";
import qs from "qs";

import { EffectiveHoppRESTRequest } from "../interfaces/request";
import { HoppCLIError, error } from "../types/errors";
import { HoppEnvs } from "../types/request";
import { PreRequestMetrics } from "../types/response";
import { isHoppCLIError } from "./checks";
import { arrayFlatMap, arraySort, tupleToRecord } from "./functions/array";
import { getEffectiveFinalMetaData } from "./getters";
import { toFormData } from "./mutators";

/**
 * Runs pre-request-script runner over given request which extracts set ENVs and
 * applies them on current request to generate updated request.
 * @param request HoppRESTRequest to be converted to EffectiveHoppRESTRequest.
 * @param envs Environment variables related to request.
 * @returns EffectiveHoppRESTRequest that includes parsed ENV variables with in
 * request OR HoppCLIError with error code and related information.
 */
export const preRequestScriptRunner = (
  request: HoppRESTRequest,
  envs: HoppEnvs
): TE.TaskEither<
  HoppCLIError,
  { effectiveRequest: EffectiveHoppRESTRequest } & { updatedEnvs: HoppEnvs }
> =>
  pipe(
    TE.of(request),
    TE.chain(({ preRequestScript }) =>
      runPreRequestScript(preRequestScript, envs)
    ),
    TE.map(
      ({ selected, global }) =>
        <Environment>{ name: "Env", variables: [...selected, ...global] }
    ),
    TE.chainEitherKW((env) => getEffectiveRESTRequest(request, env)),
    TE.mapLeft((reason) =>
      isHoppCLIError(reason)
        ? reason
        : error({
            code: "PRE_REQUEST_SCRIPT_ERROR",
            data: reason,
          })
    )
  );

/**
 * Outputs an executable request format with environment variables applied
 *
 * @param request The request to source from
 * @param environment The environment to apply
 *
 * @returns An object with extra fields defining a complete request
 */
export function getEffectiveRESTRequest(
  request: HoppRESTRequest,
  environment: Environment
): E.Either<
  HoppCLIError,
  { effectiveRequest: EffectiveHoppRESTRequest } & { updatedEnvs: HoppEnvs }
> {
  const envVariables = environment.variables;

  // Parsing final headers with applied ENVs.
  const _effectiveFinalHeaders = getEffectiveFinalMetaData(
    request.headers,
    environment
  );
  if (E.isLeft(_effectiveFinalHeaders)) {
    return _effectiveFinalHeaders;
  }
  const effectiveFinalHeaders = _effectiveFinalHeaders.right;

  // Parsing final parameters with applied ENVs.
  const _effectiveFinalParams = getEffectiveFinalMetaData(
    request.params,
    environment
  );
  if (E.isLeft(_effectiveFinalParams)) {
    return _effectiveFinalParams;
  }
  const effectiveFinalParams = _effectiveFinalParams.right;

  // Authentication
  if (request.auth.authActive) {
    // TODO: Support a better b64 implementation than btoa ?
    if (request.auth.authType === "basic") {
      const username = parseTemplateString(request.auth.username, envVariables);
      const password = parseTemplateString(request.auth.password, envVariables);

      effectiveFinalHeaders.push({
        active: true,
        key: "Authorization",
        value: `Basic ${btoa(`${username}:${password}`)}`,
      });
    } else if (request.auth.authType === "bearer") {
      effectiveFinalHeaders.push({
        active: true,
        key: "Authorization",
        value: `Bearer ${parseTemplateString(request.auth.token, envVariables)}`,
      });
    } else if (request.auth.authType === "oauth-2") {
      const { addTo } = request.auth;

      if (addTo === "HEADERS") {
        effectiveFinalHeaders.push({
          active: true,
          key: "Authorization",
          value: `Bearer ${parseTemplateString(request.auth.grantTypeInfo.token, envVariables)}`,
        });
      } else if (addTo === "QUERY_PARAMS") {
        effectiveFinalParams.push({
          active: true,
          key: "access_token",
          value: parseTemplateString(
            request.auth.grantTypeInfo.token,
            envVariables
          ),
        });
      }
    } else if (request.auth.authType === "api-key") {
      const { key, value, addTo } = request.auth;
      if (addTo === "Headers") {
        effectiveFinalHeaders.push({
          active: true,
          key: parseTemplateString(key, envVariables),
          value: parseTemplateString(value, envVariables),
        });
      } else if (addTo === "Query params") {
        effectiveFinalParams.push({
          active: true,
          key: parseTemplateString(key, envVariables),
          value: parseTemplateString(value, envVariables),
        });
      }
    }
  }

  // Parsing final-body with applied ENVs.
  const _effectiveFinalBody = getFinalBodyFromRequest(request, envVariables);
  if (E.isLeft(_effectiveFinalBody)) {
    return _effectiveFinalBody;
  }
  const effectiveFinalBody = _effectiveFinalBody.right;

  if (request.body.contentType)
    effectiveFinalHeaders.push({
      active: true,
      key: "content-type",
      value: request.body.contentType,
    });

  // Parsing final-endpoint with applied ENVs.
  const _effectiveFinalURL = parseTemplateStringE(
    request.endpoint,
    envVariables
  );
  if (E.isLeft(_effectiveFinalURL)) {
    return E.left(
      error({
        code: "PARSING_ERROR",
        data: `${request.endpoint} (${_effectiveFinalURL.left})`,
      })
    );
  }
  const effectiveFinalURL = _effectiveFinalURL.right;

  // Secret environment variables referenced in the request endpoint should be masked
  let effectiveFinalDisplayURL;
  if (envVariables.some(({ secret }) => secret)) {
    const _effectiveFinalDisplayURL = parseTemplateStringE(
      request.endpoint,
      envVariables,
      true
    );

    if (E.isRight(_effectiveFinalDisplayURL)) {
      effectiveFinalDisplayURL = _effectiveFinalDisplayURL.right;
    }
  }

  return E.right({
    effectiveRequest: {
      ...request,
      effectiveFinalURL,
      effectiveFinalDisplayURL,
      effectiveFinalHeaders,
      effectiveFinalParams,
      effectiveFinalBody,
    },
    updatedEnvs: { global: [], selected: envVariables },
  });
}

/**
 * Replaces template variables in request's body from the given set of ENVs,
 * to generate final request body without any template variables.
 * @param request Provides request's body, on which ENVs has to be applied.
 * @param envVariables Provides set of key-value pairs (environment variables),
 * used to parse-out template variables.
 * @returns Final request body without any template variables as value.
 * Or, HoppCLIError in case of error while parsing.
 */
function getFinalBodyFromRequest(
  request: HoppRESTRequest,
  envVariables: Environment["variables"]
): E.Either<HoppCLIError, string | null | FormData> {
  if (request.body.contentType === null) {
    return E.right(null);
  }

  if (request.body.contentType === "application/x-www-form-urlencoded") {
    return pipe(
      request.body.body,
      parseRawKeyValueEntriesE,
      E.map(
        flow(
          RA.toArray,

          /**
           * Filtering out empty keys and non-active pairs.
           */
          A.filter(({ active, key }) => active && !S.isEmpty(key)),

          /**
           * Mapping each key-value to template-string-parser with either on array,
           * which will be resolved in further steps.
           */
          A.map(({ key, value }) => [
            parseTemplateStringE(key, envVariables),
            parseTemplateStringE(value, envVariables),
          ]),

          /**
           * Filtering and mapping only right-eithers for each key-value as [string, string].
           */
          A.filterMap(([key, value]) =>
            E.isRight(key) && E.isRight(value)
              ? O.some([key.right, value.right] as [string, string])
              : O.none
          ),
          tupleToRecord,
          qs.stringify
        )
      ),
      E.mapLeft((e) => error({ code: "PARSING_ERROR", data: e.message }))
    );
  }

  if (request.body.contentType === "multipart/form-data") {
    return pipe(
      request.body.body,
      A.filter((x) => x.key !== "" && x.active), // Remove empty keys

      // Sort files down
      arraySort((a, b) => {
        if (a.isFile) return 1;
        if (b.isFile) return -1;
        return 0;
      }),

      // FormData allows only a single blob in an entry,
      // we split array blobs into separate entries (FormData will then join them together during exec)
      arrayFlatMap((x) =>
        x.isFile
          ? x.value.map((v) => ({
              key: parseTemplateString(x.key, envVariables),
              value: v as string | Blob,
            }))
          : [
              {
                key: parseTemplateString(x.key, envVariables),
                value: parseTemplateString(x.value, envVariables),
              },
            ]
      ),
      toFormData,
      E.right
    );
  }

  return pipe(
    parseBodyEnvVariablesE(request.body.body, envVariables),
    E.mapLeft((e) =>
      error({
        code: "PARSING_ERROR",
        data: `${request.body.body} (${e})`,
      })
    )
  );
}

/**
 * Get pre-request-metrics (stats + duration) object based on existence of
 * PRE_REQUEST_ERROR code in given hopp-error list.
 * @param errors List of errors to check for PRE_REQUEST_ERROR code.
 * @param duration Time taken (in seconds) to execute the pre-request-script.
 * @returns Object containing details of pre-request-script's execution stats
 * i.e., failed/passed data and duration.
 */
export const getPreRequestMetrics = (
  errors: HoppCLIError[],
  duration: number
): PreRequestMetrics =>
  pipe(
    errors,
    A.some(({ code }) => code === "PRE_REQUEST_SCRIPT_ERROR"),
    (hasPreReqErrors) =>
      hasPreReqErrors ? { failed: 1, passed: 0 } : { failed: 0, passed: 1 },
    (scripts) => <PreRequestMetrics>{ scripts, duration }
  );
