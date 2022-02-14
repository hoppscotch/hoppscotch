export type HoppGQLAuthNone = {
  authType: "none"
}

export type HoppGQLAuthBasic = {
  authType: "basic"

  username: string
  password: string
}

export type HoppGQLAuthBearer = {
  authType: "bearer"

  token: string
}

export type HoppGQLAuthOAuth2 = {
  authType: "oauth-2"

  token: string
  oidcDiscoveryURL: string
  authURL: string
  accessTokenURL: string
  clientID: string
  scope: string
}

export type HoppGQLAuthAPIKey = {
  authType: "api-key"

  key: string
  value: string
  addTo: string
}

export type HoppGQLAuth = { authActive: boolean } & (
  | HoppGQLAuthNone
  | HoppGQLAuthBasic
  | HoppGQLAuthBearer
  | HoppGQLAuthOAuth2
  | HoppGQLAuthAPIKey
)
