import {
  makeCollection,
  makeRESTRequest,
  HoppRESTReqBody,
  HoppCollection,
  ValidContentTypes,
} from "@hoppscotch/data"

import * as A from "fp-ts/Array"
import * as O from "fp-ts/Option"
import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"

import { z } from "zod"

import { safeParseJSON } from "~/helpers/functional/json"
import { IMPORTER_INVALID_FILE_FORMAT } from "."

/* ---------------- Types ---------------- */

type YaakHeader = {
  name: string
  value: string
  enabled: boolean
}

type YaakRequest = {
  id: string
  name?: string
  url?: string
  method?: string
  folderId?: string | null
  headers?: YaakHeader[]
  body?: { text?: string }
  bodyType?: string | null
}

type YaakFolder = {
  id: string
  name: string
  folderId?: string | null
}

/* ---------------- Zod Schema ---------------- */

const yaakExportSchema = z.object({
  yaakVersion: z.string(),
  yaakSchema: z.number(),
  resources: z.object({
    workspaces: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
        })
      )
      .optional(),

    folders: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          folderId: z.string().nullable().optional(),
        })
      )
      .optional(),

    httpRequests: z
      .array(
        z.object({
          id: z.string(),
          name: z.string().optional(),
          url: z.string().optional(),
          method: z.string().optional(),
          folderId: z.string().nullable().optional(),
          headers: z
            .array(
              z.object({
                enabled: z.boolean(),
                name: z.string(),
                value: z.string(),
              })
            )
            .optional(),
          body: z
            .object({
              text: z.string().optional(),
            })
            .optional(),
          bodyType: z.string().nullable().optional(),
        })
      )
      .optional(),
  }),
})

type YaakExport = z.infer<typeof yaakExportSchema>

/* ---------------- Content Type Mapping ---------------- */

const yaakContentTypeMap: Record<string, ValidContentTypes> = {
  json: "application/json",
  text: "text/plain",
  xml: "application/xml",
  html: "text/html",
}

/* ---------------- Helpers ---------------- */

const convertHeaders = (headers: YaakHeader[] = []) =>
  headers.map((h) => ({
    key: h.name,
    value: h.value,
    active: h.enabled,
    description: "",
  }))

const convertBody = (req: YaakRequest): HoppRESTReqBody => {
  if (!req.body?.text) {
    return {
      contentType: null,
      body: null,
    }
  }

  const contentType: ValidContentTypes =
    yaakContentTypeMap[req.bodyType ?? ""] ?? "text/plain"

  return {
    contentType,
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

/* ---------------- Folder Tree ---------------- */

const buildFolderTree = (
  folders: YaakFolder[],
  requests: YaakRequest[],
  parentId: string | null = null
): HoppCollection[] =>
  folders
    .filter((f) => (f.folderId ?? null) === parentId)
    .map((folder) =>
      makeCollection({
        name: folder.name,
        folders: buildFolderTree(folders, requests, folder.id),
        requests: requests
          .filter((r) => (r.folderId ?? null) === folder.id)
          .map(convertRequest),
        auth: { authType: "inherit", authActive: true },
        headers: [],
        variables: [],
        description: null,
      })
    )

/* ---------------- Importer ---------------- */

export const hoppYaakImporter = (fileContents: string[]) =>
  pipe(
    fileContents,

    A.traverse(O.Applicative)((content) =>
      pipe(
        safeParseJSON(content),

        O.chain((json) => {
          const parsed = yaakExportSchema.safeParse(json)

          return parsed.success ? O.of(parsed.data) : O.none
        })
      )
    ),

    O.map((exports) =>
      exports.map((exp: YaakExport) => {
        const workspaceName =
          exp.resources?.workspaces?.[0]?.name ?? "Yaak Import"

        const folders = exp.resources?.folders ?? []
        const requests = exp.resources?.httpRequests ?? []

        const folderCollections = buildFolderTree(folders, requests)

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
