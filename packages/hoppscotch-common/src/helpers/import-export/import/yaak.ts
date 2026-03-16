import {
  makeCollection,
  makeRESTRequest,
  HoppRESTHeader,
  HoppRESTReqBody,
  ValidContentTypes,
} from "@hoppscotch/data"

import * as A from "fp-ts/Array"
import * as O from "fp-ts/Option"
import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"

import { safeParseJSON } from "~/helpers/functional/json"
import { IMPORTER_INVALID_FILE_FORMAT } from "."

/* ---------------- Types ---------------- */

type YaakHeader = {
  enabled: boolean
  name: string
  value: string
}

type YaakRequest = {
  id: string
  folderId?: string | null
  name?: string
  url?: string
  method?: string
  headers?: YaakHeader[]
  body?: { text?: string }
  bodyType?: string | null
}

type YaakFolder = {
  id: string
  name: string
}

type YaakWorkspace = {
  name: string
}

type YaakExport = {
  resources: {
    workspaces?: YaakWorkspace[]
    folders?: YaakFolder[]
    httpRequests?: YaakRequest[]
  }
}

const convertHeaders = (headers?: YaakHeader[]): HoppRESTHeader[] =>
  (headers ?? []).map((h) => ({
    key: h.name,
    value: h.value,
    active: h.enabled,
    description: "",
  }))

const convertBody = (req: YaakRequest): HoppRESTReqBody => {
  if (!req.body?.text) {
    return { contentType: null, body: null }
  }

  return {
    contentType: (req.bodyType ?? "text/plain") as ValidContentTypes,
    body: req.body.text,
  } as HoppRESTReqBody
}

const convertRequest = (req: YaakRequest) =>
  makeRESTRequest({
    name: req.name ?? "",
    endpoint: req.url ?? "",
    method: (req.method ?? "GET").toUpperCase(),
    headers: convertHeaders(req.headers),
    params: [],
    auth: { authType: "inherit", authActive: true },
    body: convertBody(req),
    requestVariables: [],
    responses: {},
    preRequestScript: "",
    testScript: "",
    description: null,
  })

export const hoppYaakImporter = (fileContents: string[]) =>
  pipe(
    fileContents,
    A.traverse(O.Applicative)((content) =>
      pipe(
        safeParseJSON(content),
        O.map((data) => data as YaakExport)
      )
    ),

    O.map((exports) =>
      exports.map((exp) => {
        const workspaceName =
          exp.resources?.workspaces?.[0]?.name ?? "Yaak Import"

        const folders = exp.resources?.folders ?? []
        const requests = exp.resources?.httpRequests ?? []

        const folderCollections = folders.map((folder) => ({
          name: folder.name,
          folders: [],
          requests: requests
            .filter((r) => r.folderId === folder.id)
            .map(convertRequest),
          auth: { authType: "inherit", authActive: true },
          headers: [],
          variables: [],
          description: null,
        }))

        const rootRequests = requests
          .filter((r) => !r.folderId)
          .map(convertRequest)

        return makeCollection({
          name: workspaceName,
          folders: folderCollections,
          requests: rootRequests,
          auth: { authType: "inherit", authActive: true },
          headers: [],
          variables: [],
          description: null,
        })
      })
    ),

    TE.fromOption(() => IMPORTER_INVALID_FILE_FORMAT)
  )
