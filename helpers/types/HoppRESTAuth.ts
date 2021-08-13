export type HoppRESTAuthNone = {
  authType: "none"
  authName: "None"
  authActive: true
}

export type HoppRESTAuthBasic = {
  authType: "basic"
  authName: "Basic Auth"
  authActive: true

  username: string
  password: string
}

export type HoppRESTAuthBearer = {
  authType: "bearer"
  authName: "Bearer Token"
  authActive: true

  token: string
}

export type HoppRESTAuth =
  | HoppRESTAuthNone
  | HoppRESTAuthBasic
  | HoppRESTAuthBearer
