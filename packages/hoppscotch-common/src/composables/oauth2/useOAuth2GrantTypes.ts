import { HoppGQLAuthOAuth2, HoppRESTAuthOAuth2 } from "@hoppscotch/data"
import * as E from "fp-ts/Either"
import { Ref, computed } from "vue"
import { z } from "zod"
import { useI18n } from "~/composables/i18n"
import { useToast } from "~/composables/toast"
import { refWithCallbackOnChange } from "~/composables/ref"
import {
  replaceTemplateString,
  replaceTemplateStringsInObjectValues,
} from "~/helpers/auth"
import authCode, {
  AuthCodeOauthFlowParams,
  AuthCodeOauthRefreshParams,
  getDefaultAuthCodeOauthFlowParams,
} from "~/services/oauth/flows/authCode"
import clientCredentials, {
  ClientCredentialsFlowParams,
  getDefaultClientCredentialsFlowParams,
} from "~/services/oauth/flows/clientCredentials"
import implicit, {
  ImplicitOauthFlowParams,
  getDefaultImplicitOauthFlowParams,
} from "~/services/oauth/flows/implicit"
import passwordFlow, {
  PasswordFlowParams,
  getDefaultPasswordFlowParams,
} from "~/services/oauth/flows/password"
import { AuthRequestParam, TokenRequestParam } from "./useOAuth2AdvancedParams"

export type GrantTypes = z.infer<
  typeof HoppRESTAuthOAuth2
>["grantTypeInfo"]["grantType"]

export const useOAuth2GrantTypes = (
  auth: Ref<HoppRESTAuthOAuth2 | HoppGQLAuthOAuth2>,
  setAccessTokenInActiveContext: (
    accessToken?: string,
    refreshToken?: string
  ) => void,
  workingAuthRequestParams: Ref<AuthRequestParam[]>,
  workingTokenRequestParams: Ref<TokenRequestParam[]>,
  workingRefreshRequestParams: Ref<TokenRequestParam[]>,
  pkceTippyActions: Ref<HTMLElement | null>,
  clientAuthenticationTippyActions: Ref<HTMLElement | null>
) => {
  const t = useI18n()
  const toast = useToast()

  // Helper function to prepare request parameters
  const prepareRequestParams = (
    params: Ref<AuthRequestParam[] | TokenRequestParam[]>
  ) => {
    return params.value
      .filter((p) => p.active && p.key && p.value)
      .map((p) => ({
        id: p.id,
        key: replaceTemplateString(p.key),
        value: replaceTemplateString(p.value),
        active: p.active,
        sendIn: p.sendIn || "body",
      }))
  }

  const preparedAuthRequestParams = computed(() => {
    return prepareRequestParams(workingAuthRequestParams)
  })

  const preparedTokenRequestParams = computed(() => {
    return prepareRequestParams(workingTokenRequestParams)
  })

  const preparedRefreshRequestParams = computed(() => {
    return prepareRequestParams(workingRefreshRequestParams)
  })

  const grantTypeMap: Record<
    GrantTypes,
    "authCode" | "clientCredentials" | "password" | "implicit"
  > = {
    AUTHORIZATION_CODE: "authCode",
    CLIENT_CREDENTIALS: "clientCredentials",
    IMPLICIT: "implicit",
    PASSWORD: "password",
  } as const

  const grantTypeDefaultPayload = {
    AUTHORIZATION_CODE: getDefaultAuthCodeOauthFlowParams,
    CLIENT_CREDENTIALS: getDefaultClientCredentialsFlowParams,
    IMPLICIT: getDefaultImplicitOauthFlowParams,
    PASSWORD: getDefaultPasswordFlowParams,
  } as const

  const supportedGrantTypes = [
    {
      id: "authCode" as const,
      label: t("authorization.oauth.label_auth_code"),
      formElements: computed(() => {
        if (!(auth.value.grantTypeInfo.grantType === "AUTHORIZATION_CODE")) {
          return
        }

        const grantType = auth.value.grantTypeInfo

        const authEndpoint = refWithCallbackOnChange(
          grantType?.authEndpoint,
          (value) => {
            auth.value.grantTypeInfo = {
              ...auth.value.grantTypeInfo,
              authEndpoint: value,
            }
          }
        )

        const tokenEndpoint = refWithCallbackOnChange(
          grantType?.tokenEndpoint,
          (value) => {
            if (!("tokenEndpoint" in auth.value.grantTypeInfo)) {
              return
            }

            auth.value.grantTypeInfo = {
              ...auth.value.grantTypeInfo,
              tokenEndpoint: value,
            }
          }
        )

        const clientID = refWithCallbackOnChange(
          grantType?.clientID,
          (value) => {
            auth.value.grantTypeInfo = {
              ...auth.value.grantTypeInfo,
              clientID: value,
            }
          }
        )

        const clientSecret = refWithCallbackOnChange(
          grantType?.clientSecret,
          (value) => {
            if (!("clientSecret" in auth.value.grantTypeInfo)) {
              return
            }

            auth.value.grantTypeInfo = {
              ...auth.value.grantTypeInfo,
              clientSecret: value ?? "",
            }
          }
        )

        const scopes = refWithCallbackOnChange(
          grantType?.scopes ? grantType.scopes : undefined,
          (value) => {
            auth.value.grantTypeInfo = {
              ...auth.value.grantTypeInfo,
              scopes: value,
            }
          }
        )

        const isPKCE = refWithCallbackOnChange(
          auth.value.grantTypeInfo.isPKCE,
          (value) => {
            if (!("isPKCE" in auth.value.grantTypeInfo)) {
              return
            }

            auth.value.grantTypeInfo = {
              ...auth.value.grantTypeInfo,
              isPKCE: value,
            }
          }
        )

        const codeChallenge: Ref<{
          id: "plain" | "S256"
          label: string
        } | null> = refWithCallbackOnChange(
          auth.value.grantTypeInfo.codeVerifierMethod
            ? {
                id: auth.value.grantTypeInfo.codeVerifierMethod,
                label:
                  auth.value.grantTypeInfo.codeVerifierMethod === "plain"
                    ? "Plain"
                    : "SHA-256",
              }
            : null,
          (value) => {
            if (!("codeVerifierMethod" in auth.value.grantTypeInfo) || !value) {
              return
            }

            auth.value.grantTypeInfo = {
              ...auth.value.grantTypeInfo,
              codeVerifierMethod: value.id,
            }
          }
        )

        const refreshToken = async () => {
          const grantTypeInfo = auth.value.grantTypeInfo

          if (!("refreshToken" in grantTypeInfo)) {
            return E.left("NO_REFRESH_TOKEN_PRESENT" as const)
          }

          const refreshToken = grantTypeInfo.refreshToken

          if (!refreshToken) {
            return E.left("NO_REFRESH_TOKEN_PRESENT" as const)
          }

          const params: AuthCodeOauthRefreshParams = {
            clientID: clientID.value,
            clientSecret: clientSecret.value,
            tokenEndpoint: tokenEndpoint.value,
            refreshToken,
          }

          const unwrappedParams = replaceTemplateStringsInObjectValues(params)

          const refreshTokenFunc = authCode.refreshToken

          if (!refreshTokenFunc) {
            return E.left("REFRESH_TOKEN_FUNCTION_NOT_DEFINED" as const)
          }

          const res = await refreshTokenFunc(unwrappedParams)

          if (E.isLeft(res)) {
            return E.left("OAUTH_REFRESH_TOKEN_FAILED" as const)
          }

          setAccessTokenInActiveContext(
            res.right.access_token,
            res.right.refresh_token
          )

          return E.right(undefined)
        }

        const runAction = async () => {
          const params: AuthCodeOauthFlowParams = {
            authEndpoint: authEndpoint.value,
            tokenEndpoint: tokenEndpoint.value,
            clientID: clientID.value,
            clientSecret: clientSecret.value,
            scopes: scopes.value,
            isPKCE: isPKCE.value,
            codeVerifierMethod: codeChallenge.value?.id,
            authRequestParams: preparedAuthRequestParams.value,
            tokenRequestParams: preparedTokenRequestParams.value,
            refreshRequestParams: preparedRefreshRequestParams.value,
          }

          const unwrappedParams = replaceTemplateStringsInObjectValues(params)

          const parsedArgs = authCode.params.safeParse(unwrappedParams)

          if (!parsedArgs.success) {
            return E.left("VALIDATION_FAILED" as const)
          }

          const res = await authCode.init(parsedArgs.data)

          if (E.isLeft(res)) {
            return res
          }

          return E.right(undefined)
        }

        const pkceElements = computed(() => {
          const checkbox = {
            id: "isPKCE",
            label: t("authorization.oauth.label_use_pkce"),
            type: "checkbox" as const,
            ref: isPKCE,
            onChange: (e: Event) => {
              const target = e.target as HTMLInputElement
              isPKCE.value = target.checked
            },
          }

          return isPKCE.value
            ? [
                checkbox,
                {
                  id: "codeChallenge",
                  label: t("authorization.oauth.label_code_challenge"),
                  type: "dropdown" as const,
                  ref: codeChallenge,
                  tippyRefName: "pkceTippyActions",
                  tippyRef: pkceTippyActions,
                  options: [
                    {
                      id: "plain" as const,
                      label: "Plain",
                    },
                    {
                      id: "S256" as const,
                      label: "SHA-256",
                    },
                  ],
                },
              ]
            : [checkbox]
        })

        const elements = computed(() => {
          return [
            ...pkceElements.value,
            {
              id: "authEndpoint",
              label: t("authorization.oauth.label_authorization_endpoint"),
              type: "text" as const,
              ref: authEndpoint,
            },
            {
              id: "tokenEndpoint",
              label: t("authorization.oauth.label_token_endpoint"),
              type: "text" as const,
              ref: tokenEndpoint,
            },
            {
              id: "clientId",
              label: t("authorization.oauth.label_client_id"),
              type: "text" as const,
              ref: clientID,
            },
            {
              id: "clientSecret",
              label: t("authorization.oauth.label_client_secret"),
              type: "text" as const,
              ref: clientSecret,
            },
            {
              id: "scopes",
              label: t("authorization.oauth.label_scopes"),
              type: "text" as const,
              ref: scopes,
            },
          ]
        })

        return {
          runAction,
          refreshToken,
          elements,
        }
      }),
    },
    {
      id: "clientCredentials" as const,
      label: t("authorization.oauth.label_client_credentials"),
      formElements: computed(() => {
        if (!(auth.value.grantTypeInfo.grantType === "CLIENT_CREDENTIALS")) {
          return
        }

        const grantTypeInfo = auth.value.grantTypeInfo

        const authEndpoint = refWithCallbackOnChange(
          grantTypeInfo?.authEndpoint,
          (value) => {
            auth.value.grantTypeInfo = {
              ...auth.value.grantTypeInfo,
              authEndpoint: value,
            }
          }
        )

        const clientID = refWithCallbackOnChange(
          grantTypeInfo?.clientID,
          (value) => {
            auth.value.grantTypeInfo = {
              ...auth.value.grantTypeInfo,
              clientID: value,
            }
          }
        )

        const clientSecret = refWithCallbackOnChange(
          grantTypeInfo?.clientSecret,
          (value) => {
            if (!("clientSecret" in auth.value.grantTypeInfo)) {
              return
            }

            auth.value.grantTypeInfo = {
              ...auth.value.grantTypeInfo,
              clientSecret: value,
            }
          }
        )

        const scopes = refWithCallbackOnChange(
          grantTypeInfo?.scopes ? grantTypeInfo.scopes : undefined,
          (value) => {
            auth.value.grantTypeInfo = {
              ...auth.value.grantTypeInfo,
              scopes: value,
            }
          }
        )

        const clientAuthentication = refWithCallbackOnChange(
          grantTypeInfo.clientAuthentication
            ? grantTypeInfo.clientAuthentication === "AS_BASIC_AUTH_HEADERS"
              ? {
                  id: "AS_BASIC_AUTH_HEADERS" as const,
                  label: t("authorization.oauth.label_send_as_basic_auth"),
                }
              : {
                  id: "IN_BODY" as const,
                  label: t("authorization.oauth.label_send_in_body"),
                }
            : {
                id: "IN_BODY" as const,
                label: t("authorization.oauth.label_send_in_body"),
              },
          (value) => {
            if (!("clientAuthentication" in auth.value.grantTypeInfo)) {
              return
            }

            auth.value.grantTypeInfo = {
              ...auth.value.grantTypeInfo,
              clientAuthentication: value.id,
            }
          }
        )

        const runAction = async () => {
          const values: ClientCredentialsFlowParams =
            replaceTemplateStringsInObjectValues({
              authEndpoint: authEndpoint.value,
              clientID: clientID.value,
              clientSecret: clientSecret.value,
              scopes: scopes.value,
              clientAuthentication: clientAuthentication.value.id,
              tokenRequestParams: preparedTokenRequestParams.value,
              refreshRequestParams: preparedRefreshRequestParams.value,
            })

          const parsedArgs = clientCredentials.params.safeParse(values)

          if (!parsedArgs.success) {
            return E.left("VALIDATION_FAILED" as const)
          }

          const res = await clientCredentials.init(parsedArgs.data)

          if (E.isLeft(res)) {
            return E.left("OAUTH_TOKEN_FETCH_FAILED" as const)
          }

          setAccessTokenInActiveContext(res.right?.access_token)

          toast.success(t("authorization.oauth.token_fetched_successfully"))

          return E.right(undefined)
        }

        const elements = computed(() => {
          return [
            {
              id: "authEndpoint",
              label: t("authorization.oauth.label_authorization_endpoint"),
              type: "text" as const,
              ref: authEndpoint,
            },
            {
              id: "clientId",
              label: t("authorization.oauth.label_client_id"),
              type: "text" as const,
              ref: clientID,
            },
            {
              id: "clientSecret",
              label: t("authorization.oauth.label_client_secret"),
              type: "text" as const,
              ref: clientSecret,
            },
            {
              id: "scopes",
              label: t("authorization.oauth.label_scopes"),
              type: "text" as const,
              ref: scopes,
            },
            {
              id: "clientAuthentication",
              label: t("authorization.oauth.label_send_as"),
              type: "dropdown" as const,
              ref: clientAuthentication,
              tippyRefName: "clientAuthenticationTippyActions",
              tippyRef: clientAuthenticationTippyActions,
              options: [
                {
                  id: "IN_BODY" as const,
                  label: t("authorization.oauth.label_send_in_body"),
                },
                {
                  id: "AS_BASIC_AUTH_HEADERS" as const,
                  label: t("authorization.oauth.label_send_as_basic_auth"),
                },
              ],
            },
          ]
        })

        return {
          runAction,
          elements,
        }
      }),
    },
    {
      id: "password" as const,
      label: "Password",
      formElements: computed(() => {
        if (!(auth.value.grantTypeInfo.grantType === "PASSWORD")) {
          return
        }

        const grantTypeInfo = auth.value.grantTypeInfo

        const authEndpoint = refWithCallbackOnChange(
          grantTypeInfo?.authEndpoint,
          (value) => {
            auth.value.grantTypeInfo = {
              ...auth.value.grantTypeInfo,
              authEndpoint: value,
            }
          }
        )

        const clientID = refWithCallbackOnChange(
          grantTypeInfo?.clientID,
          (value) => {
            auth.value.grantTypeInfo = {
              ...auth.value.grantTypeInfo,
              clientID: value,
            }
          }
        )

        const clientSecret = refWithCallbackOnChange(
          grantTypeInfo?.clientSecret,
          (value) => {
            if (!("clientSecret" in auth.value.grantTypeInfo)) {
              return
            }

            auth.value.grantTypeInfo = {
              ...auth.value.grantTypeInfo,
              clientSecret: value,
            }
          }
        )

        const scopes = refWithCallbackOnChange(
          grantTypeInfo?.scopes ? grantTypeInfo.scopes : undefined,
          (value) => {
            auth.value.grantTypeInfo.scopes = value
          }
        )

        const username = refWithCallbackOnChange(
          grantTypeInfo?.username,
          (value) => {
            if (!("username" in auth.value.grantTypeInfo)) {
              return
            }

            auth.value.grantTypeInfo = {
              ...auth.value.grantTypeInfo,
              username: value,
            }
          }
        )

        const password = refWithCallbackOnChange(
          grantTypeInfo?.password,
          (value) => {
            if (!("password" in auth.value.grantTypeInfo)) {
              return
            }

            auth.value.grantTypeInfo = {
              ...auth.value.grantTypeInfo,
              password: value,
            }
          }
        )

        const runAction = async () => {
          const values: PasswordFlowParams =
            replaceTemplateStringsInObjectValues({
              authEndpoint: authEndpoint.value,
              clientID: clientID.value,
              clientSecret: clientSecret.value,
              scopes: scopes.value,
              username: username.value,
              password: password.value,
              tokenRequestParams: preparedTokenRequestParams.value,
              refreshRequestParams: preparedRefreshRequestParams.value,
            })

          const parsedArgs = passwordFlow.params.safeParse(values)

          if (!parsedArgs.success) {
            return E.left("VALIDATION_FAILED" as const)
          }

          const res = await passwordFlow.init(parsedArgs.data)

          if (E.isLeft(res)) {
            return E.left("OAUTH_TOKEN_FETCH_FAILED" as const)
          }

          setAccessTokenInActiveContext(res.right?.access_token)

          toast.success(t("authorization.oauth.token_fetched_successfully"))

          return E.right(undefined)
        }

        const elements = computed(() => {
          return [
            {
              id: "authEndpoint",
              label: t("authorization.oauth.label_authorization_endpoint"),
              type: "text" as const,
              ref: authEndpoint,
            },
            {
              id: "clientId",
              label: t("authorization.oauth.label_client_id"),
              type: "text" as const,
              ref: clientID,
            },
            {
              id: "clientSecret",
              label: t("authorization.oauth.label_client_secret"),
              type: "text" as const,
              ref: clientSecret,
            },
            {
              id: "username",
              label: t("authorization.oauth.label_username"),
              type: "text" as const,
              ref: username,
            },
            {
              id: "password",
              label: t("authorization.oauth.label_password"),
              type: "text" as const,
              ref: password,
            },
            {
              id: "scopes",
              label: t("authorization.oauth.label_scopes"),
              type: "text" as const,
              ref: scopes,
            },
          ]
        })

        return {
          runAction,
          elements,
        }
      }),
    },
    {
      id: "implicit" as const,
      label: t("authorization.oauth.label_implicit"),
      formElements: computed(() => {
        const grantTypeInfo = auth.value.grantTypeInfo

        const authEndpoint = refWithCallbackOnChange(
          grantTypeInfo?.authEndpoint,
          (value) => {
            auth.value.grantTypeInfo = {
              ...auth.value.grantTypeInfo,
              authEndpoint: value,
            }
          }
        )

        const clientID = refWithCallbackOnChange(
          grantTypeInfo?.clientID,
          (value) => {
            auth.value.grantTypeInfo = {
              ...auth.value.grantTypeInfo,
              clientID: value,
            }
          }
        )

        const scopes = refWithCallbackOnChange(
          grantTypeInfo?.scopes ? grantTypeInfo.scopes : undefined,
          (value) => {
            auth.value.grantTypeInfo = {
              ...auth.value.grantTypeInfo,
              scopes: value,
            }
          }
        )

        const runAction = () => {
          const values: ImplicitOauthFlowParams =
            replaceTemplateStringsInObjectValues({
              authEndpoint: authEndpoint.value,
              clientID: clientID.value,
              scopes: scopes.value,
              authRequestParams: preparedAuthRequestParams.value,
              refreshRequestParams: preparedRefreshRequestParams.value,
            })

          const unwrappedValues = replaceTemplateStringsInObjectValues(values)

          const parsedArgs = implicit.params.safeParse(unwrappedValues)

          if (!parsedArgs.success) {
            return E.left("VALIDATION_FAILED" as const)
          }

          implicit.init(parsedArgs.data)

          return E.right(undefined)
        }

        const elements = computed(() => {
          return [
            {
              id: "authEndpoint",
              label: t("authorization.oauth.label_authorization_endpoint"),
              type: "text" as const,
              ref: authEndpoint,
            },
            {
              id: "clientId",
              label: t("authorization.oauth.label_client_id"),
              type: "text" as const,
              ref: clientID,
            },
            {
              id: "scopes",
              label: t("authorization.oauth.label_scopes"),
              type: "text" as const,
              ref: scopes,
            },
          ]
        })

        return {
          runAction,
          elements,
        }
      }),
    },
  ]

  const selectedGrantTypeID = computed(() => {
    const currentGrantType = auth.value.grantTypeInfo.grantType
    return grantTypeMap[currentGrantType]
  })

  const selectedGrantType = computed(() => {
    return supportedGrantTypes.find(
      (grantType) => grantType.id === selectedGrantTypeID.value
    )
  })

  const changeSelectedGrantType = (
    grantType: (typeof supportedGrantTypes)[number]["id"]
  ) => {
    const keys = Object.keys(grantTypeMap) as GrantTypes[]

    const grantTypeToSet = keys.find((key) => grantTypeMap[key] === grantType)

    if (grantTypeToSet) {
      auth.value.grantTypeInfo.grantType = grantTypeToSet

      const getDefaultPayload = grantTypeDefaultPayload[grantTypeToSet]

      if (getDefaultPayload) {
        auth.value.grantTypeInfo = {
          ...getDefaultPayload(),
          ...auth.value.grantTypeInfo,
        }
      }
    }
  }

  const runAction = computed(() => {
    return selectedGrantType.value?.formElements.value?.runAction
  })

  const runTokenRefresh = computed(() => {
    if (selectedGrantType.value?.id === "authCode") {
      return selectedGrantType.value?.formElements.value?.refreshToken
    }
    return null
  })

  const currentOAuthGrantTypeFormElements = computed(() => {
    return selectedGrantType.value?.formElements.value?.elements.value
  })

  return {
    supportedGrantTypes,
    selectedGrantTypeID,
    selectedGrantType,
    changeSelectedGrantType,
    runAction,
    runTokenRefresh,
    currentOAuthGrantTypeFormElements,
  }
}
