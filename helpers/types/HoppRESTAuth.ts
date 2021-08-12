export type HoppRESTAuthNone = {
  authType: "none"
  authActive: true
}

export type HoppRESTAuthBasic = {
  authType: "basic"
  authActive: true

  username: string
  password: string
}

export type HoppRESTAuthBearer = {
  authType: "bearer"
  authActive: true

  token: string
}

export type HoppRESTAuth =
  | HoppRESTAuthNone
  | HoppRESTAuthBasic
  | HoppRESTAuthBearer
