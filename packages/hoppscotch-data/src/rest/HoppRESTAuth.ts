export type HoppRESTAuthNone = {
  authType: "none"
}

export type HoppRESTAuthBasic = {
  authType: "basic"

  username: string
  password: string
}

export type HoppRESTAuthBearer = {
  authType: "bearer"

  token: string
}

export type HoppRESTAuthOAuth2 = {
  authType: "oauth-2"

  token: string
  oidcDiscoveryURL: string
  authURL: string
  accessTokenURL: string
  clientID: string
  scope: string
}

export type HoppRESTAuthAPIKey = {
  authType: "api-key"

  key: string
  value: string
  addTo: string
}

export type HoppRESTAuth = { authActive: boolean } & (
  | HoppRESTAuthNone
  | HoppRESTAuthBasic
  | HoppRESTAuthBearer
  | HoppRESTAuthOAuth2
  | HoppRESTAuthAPIKey
)
