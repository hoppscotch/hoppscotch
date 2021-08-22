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

export type HoppRESTAuth = { authActive: boolean } & (
  | HoppRESTAuthNone
  | HoppRESTAuthBasic
  | HoppRESTAuthBearer
)
