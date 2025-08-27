import { HoppGQLAuthOAuth2, HoppRESTAuthOAuth2 } from "@hoppscotch/data"
import { Ref, ref, watch } from "vue"

export type AuthRequestParam = {
  id: number
  key: string
  value: string
  active: boolean
  sendIn?: "headers" | "url" | "body"
}

export type TokenRequestParam = {
  id: number
  key: string
  value: string
  active: boolean
  sendIn: "headers" | "url" | "body"
}

let paramsIdCounter = 1000

export const useOAuth2AdvancedParams = (
  auth: Ref<HoppRESTAuthOAuth2 | HoppGQLAuthOAuth2>
) => {
  // Auth Request Parameters
  const workingAuthRequestParams = ref<AuthRequestParam[]>([
    { id: paramsIdCounter++, key: "", value: "", active: true },
  ])

  // Token Request Parameters
  const workingTokenRequestParams = ref<TokenRequestParam[]>([
    {
      id: paramsIdCounter++,
      key: "",
      value: "",
      sendIn: "body",
      active: true,
    },
  ])

  // Refresh Request Parameters
  const workingRefreshRequestParams = ref<TokenRequestParam[]>([
    {
      id: paramsIdCounter++,
      key: "",
      value: "",
      sendIn: "body",
      active: true,
    },
  ])

  // Watch for changes in working auth request params
  watch(
    workingAuthRequestParams,
    (newParams: AuthRequestParam[]) => {
      // Auto-add empty row when the last row is filled
      if (newParams.length > 0 && newParams[newParams.length - 1].key !== "") {
        workingAuthRequestParams.value.push({
          id: paramsIdCounter++,
          key: "",
          value: "",
          active: true,
        })
      }

      // Update auth.value.grantTypeInfo with non-empty params
      const nonEmptyParams = newParams.filter(
        (p: AuthRequestParam) => p.key !== "" || p.value !== ""
      )

      if ("authRequestParams" in auth.value.grantTypeInfo) {
        auth.value.grantTypeInfo.authRequestParams = nonEmptyParams.map(
          (param) => ({
            id: param.id,
            key: param.key,
            value: param.value,
            active: param.active,
          })
        )
      }
    },
    { deep: true }
  )

  // Watch for changes in working token request params
  watch(
    workingTokenRequestParams,
    (newParams: TokenRequestParam[]) => {
      // Auto-add empty row when the last row is filled
      if (newParams.length > 0 && newParams[newParams.length - 1].key !== "") {
        workingTokenRequestParams.value.push({
          id: paramsIdCounter++,
          key: "",
          value: "",
          sendIn: "body",
          active: true,
        })
      }

      // Update auth.value.grantTypeInfo with non-empty params
      const nonEmptyParams = newParams.filter(
        (p: TokenRequestParam) => p.key !== "" || p.value !== ""
      )

      if ("tokenRequestParams" in auth.value.grantTypeInfo) {
        auth.value.grantTypeInfo.tokenRequestParams = nonEmptyParams.map(
          (param) => ({
            id: param.id,
            key: param.key,
            value: param.value,
            sendIn: param.sendIn,
            active: param.active,
          })
        )
      }
    },
    { deep: true }
  )

  // Watch for changes in working refresh request params
  watch(
    workingRefreshRequestParams,
    (newParams: TokenRequestParam[]) => {
      // Auto-add empty row when the last row is filled
      if (newParams.length > 0 && newParams[newParams.length - 1].key !== "") {
        workingRefreshRequestParams.value.push({
          id: paramsIdCounter++,
          key: "",
          value: "",
          sendIn: "body",
          active: true,
        })
      }

      // Update auth.value.grantTypeInfo with non-empty params
      const nonEmptyParams = newParams.filter(
        (p: TokenRequestParam) => p.key !== "" || p.value !== ""
      )

      if ("refreshRequestParams" in auth.value.grantTypeInfo) {
        auth.value.grantTypeInfo.refreshRequestParams = nonEmptyParams.map(
          (param) => ({
            id: param.id,
            key: param.key,
            value: param.value,
            sendIn: param.sendIn,
            active: param.active,
          })
        )
      }
    },
    { deep: true }
  )

  // Functions for auth request params management
  const addAuthRequestParam = () => {
    workingAuthRequestParams.value.push({
      id: paramsIdCounter++,
      key: "",
      value: "",
      active: true,
    })
  }

  const updateAuthRequestParam = (index: number, payload: AuthRequestParam) => {
    workingAuthRequestParams.value[index] = payload
  }

  const deleteAuthRequestParam = (index: number) => {
    if (workingAuthRequestParams.value.length > 1) {
      workingAuthRequestParams.value.splice(index, 1)
    }
  }

  // Functions for token request params management
  const addTokenRequestParam = () => {
    workingTokenRequestParams.value.push({
      id: paramsIdCounter++,
      key: "",
      value: "",
      sendIn: "body",
      active: true,
    })
  }

  const updateTokenRequestParam = (
    index: number,
    payload: TokenRequestParam
  ) => {
    workingTokenRequestParams.value[index] = payload
  }

  const deleteTokenRequestParam = (index: number) => {
    if (workingTokenRequestParams.value.length > 1) {
      workingTokenRequestParams.value.splice(index, 1)
    }
  }

  // Functions for refresh request params management
  const addRefreshRequestParam = () => {
    workingRefreshRequestParams.value.push({
      id: paramsIdCounter++,
      key: "",
      value: "",
      sendIn: "body",
      active: true,
    })
  }

  const updateRefreshRequestParam = (
    index: number,
    payload: TokenRequestParam
  ) => {
    workingRefreshRequestParams.value[index] = payload
  }

  const deleteRefreshRequestParam = (index: number) => {
    if (workingRefreshRequestParams.value.length > 1) {
      workingRefreshRequestParams.value.splice(index, 1)
    }
  }

  // Initialize advanced parameters from the auth object when component mounts
  const initializeParams = () => {
    if (
      "authRequestParams" in auth.value.grantTypeInfo &&
      auth.value.grantTypeInfo.authRequestParams &&
      auth.value.grantTypeInfo.authRequestParams.length > 0
    ) {
      workingAuthRequestParams.value =
        auth.value.grantTypeInfo.authRequestParams.map((param) => ({
          id: param.id || paramsIdCounter++,
          key: param.key,
          value: param.value,
          active: param.active,
        }))
    }

    if (
      "tokenRequestParams" in auth.value.grantTypeInfo &&
      auth.value.grantTypeInfo.tokenRequestParams &&
      auth.value.grantTypeInfo.tokenRequestParams.length > 0
    ) {
      workingTokenRequestParams.value = [
        ...auth.value.grantTypeInfo.tokenRequestParams.map((param) => ({
          id: param.id || paramsIdCounter++,
          key: param.key,
          value: param.value,
          sendIn: param.sendIn || "body",
          active: param.active,
        })),
        {
          id: paramsIdCounter++,
          key: "",
          value: "",
          sendIn: "body",
          active: true,
        },
      ]
    }

    if (
      "refreshRequestParams" in auth.value.grantTypeInfo &&
      auth.value.grantTypeInfo.refreshRequestParams &&
      auth.value.grantTypeInfo.refreshRequestParams.length > 0
    ) {
      workingRefreshRequestParams.value = [
        ...auth.value.grantTypeInfo.refreshRequestParams.map((param) => ({
          id: param.id || paramsIdCounter++,
          key: param.key,
          value: param.value,
          sendIn: param.sendIn || "body",
          active: param.active,
        })),
        {
          id: paramsIdCounter++,
          key: "",
          value: "",
          sendIn: "body",
          active: true,
        },
      ]
    }
  }

  return {
    workingAuthRequestParams,
    workingTokenRequestParams,
    workingRefreshRequestParams,
    addAuthRequestParam,
    updateAuthRequestParam,
    deleteAuthRequestParam,
    addTokenRequestParam,
    updateTokenRequestParam,
    deleteTokenRequestParam,
    addRefreshRequestParam,
    updateRefreshRequestParam,
    deleteRefreshRequestParam,
    initializeParams,
  }
}
