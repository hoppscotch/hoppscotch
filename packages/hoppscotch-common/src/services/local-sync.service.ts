import { Container, Service } from "dioc"
import { ref } from "vue"
import { Subscription } from "rxjs"
import { debounceTime, filter, skip, tap } from "rxjs/operators"
import {
  HoppCollection,
  HoppRESTRequest,
  HoppGQLRequest,
  makeCollection,
  translateToNewRequest,
  translateToGQLRequest,
} from "@hoppscotch/data"
import {
  restCollections$,
  restCollectionStore,
  setRESTCollections,
} from "~/newstore/collections"

export type LocalSyncStatus = "disconnected" | "connected" | "syncing" | "error"

export interface SerializedCollectionMeta {
  v: number
  name: string
  _ref_id?: string
  auth?: any
  headers?: any
  variables?: any
  description?: string | null
  preRequestScript?: string
  testScript?: string
  order?: {
    folders?: string[]
    requests?: string[]
  }
}

export interface RootOrderMeta {
  order: string[]
}

const DB_NAME = "hoppscotch-local-sync"
const DB_VERSION = 1
const STORE_NAME = "sync-store"
const HANDLE_KEY = "git-sync-directory-handle"

/**
 * Sanitizes path segments/file names to be safe across Windows, macOS, and Linux
 */
export function sanitizeFileName(name: string): string {
  if (!name) return "untitled"
  const sanitized = name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
  return sanitized.length > 0 ? sanitized : "untitled"
}

/**
 * Generates collision-resistant unique names in a given folder scope
 */
export function getUniqueName(
  baseName: string,
  id: string | undefined,
  usedNames: Set<string>,
  ext: string = ""
): string {
  const sanitized = sanitizeFileName(baseName)
  const candidate = `${sanitized}${ext}`
  if (!usedNames.has(candidate.toLowerCase())) {
    usedNames.add(candidate.toLowerCase())
    return candidate
  }

  const suffix = id ? `-${id.slice(-6)}` : ""
  let uniqueName = `${sanitized}${suffix}${ext}`
  let counter = 1
  while (usedNames.has(uniqueName.toLowerCase())) {
    uniqueName = `${sanitized}${suffix}-${counter}${ext}`
    counter++
  }
  usedNames.add(uniqueName.toLowerCase())
  return uniqueName
}

/**
 * Strips raw secrets/credentials from auth structures before serializing to Git
 */
export function sanitizeAuthForExport(auth: any): any {
  if (!auth || typeof auth !== "object") return auth
  const copy = { ...auth }
  if (
    "token" in copy &&
    typeof copy.token === "string" &&
    !copy.token.startsWith("<<")
  ) {
    copy.token = ""
  }
  if (
    "password" in copy &&
    typeof copy.password === "string" &&
    !copy.password.startsWith("<<")
  ) {
    copy.password = ""
  }
  if (
    "key" in copy &&
    typeof copy.key === "string" &&
    copy.authType === "api-key" &&
    !copy.key.startsWith("<<")
  ) {
    copy.key = ""
  }
  return copy
}

/**
 * Native IndexedDB helper to persist directory handle across page reloads
 */
function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      return reject(new Error("IndexedDB is not supported in this environment"))
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveHandleToIDB(
  handle: FileSystemDirectoryHandle
): Promise<void> {
  const db = await openIDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite")
    const store = tx.objectStore(STORE_NAME)
    const req = store.put(handle, HANDLE_KEY)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function getHandleFromIDB(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openIDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly")
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(HANDLE_KEY)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}

export async function removeHandleFromIDB(): Promise<void> {
  try {
    const db = await openIDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite")
      const store = tx.objectStore(STORE_NAME)
      const req = store.delete(HANDLE_KEY)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch {
    // Ignore error on deletion
  }
}

/**
 * Cross-platform entry iteration helper for FileSystemDirectoryHandle
 */
export async function getDirectoryEntries(
  dir: FileSystemDirectoryHandle
): Promise<FileSystemHandle[]> {
  const entries: FileSystemHandle[] = []
  if (typeof (dir as any).values === "function") {
    for await (const entry of (dir as any).values()) {
      entries.push(entry)
    }
  } else if (typeof (dir as any).entries === "function") {
    for await (const [, entry] of (dir as any).entries()) {
      entries.push(entry)
    }
  }
  return entries
}

/**
 * Writes JSON data to a file inside the target directory
 */
async function writeJsonFile(
  dir: FileSystemDirectoryHandle,
  fileName: string,
  data: unknown
): Promise<void> {
  const fileHandle = await dir.getFileHandle(fileName, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(JSON.stringify(data, null, 2))
  await writable.close()
}

/**
 * Reads JSON content from a file handle, failing fast with descriptive error on syntax issues
 */
async function readJsonFile<T = any>(
  fileHandle: FileSystemFileHandle
): Promise<T> {
  const file = await fileHandle.getFile()
  const text = await file.text()
  try {
    return JSON.parse(text) as T
  } catch (err: any) {
    throw new Error(
      `Failed to parse JSON in "${fileHandle.name}": ${err.message || "Invalid syntax"}`
    )
  }
}

/**
 * Resolves or creates the .hoppscotch/collections directory
 */
export async function resolveCollectionsDirectory(
  rootDir: FileSystemDirectoryHandle,
  create: boolean = false
): Promise<FileSystemDirectoryHandle> {
  let hoppDir: FileSystemDirectoryHandle
  if (rootDir.name === ".hoppscotch") {
    hoppDir = rootDir
  } else {
    hoppDir = await rootDir.getDirectoryHandle(".hoppscotch", { create })
  }
  return await hoppDir.getDirectoryHandle("collections", { create })
}

/**
 * Serializes a single collection and its subfolders/requests into a multi-file directory hierarchy
 */
export async function serializeCollectionToDir(
  collection: HoppCollection,
  parentDir: FileSystemDirectoryHandle,
  targetDirName?: string
): Promise<void> {
  const colDirName = targetDirName ?? sanitizeFileName(collection.name)
  const colDir = await parentDir.getDirectoryHandle(colDirName, {
    create: true,
  })

  const usedFileNames = new Set<string>(["_collection.json"])
  const serializedRequests: Array<{ fileName: string; req: any }> = []
  for (const req of collection.requests ?? []) {
    const fileName = getUniqueName(
      req.name,
      req._ref_id || (req as any).id,
      usedFileNames,
      ".json"
    )
    const { id: _reqId, ...cleanReq } = req as any
    if (cleanReq.auth) {
      cleanReq.auth = sanitizeAuthForExport(cleanReq.auth)
    }
    serializedRequests.push({ fileName, req: cleanReq })
  }

  const usedSubFolderNames = new Set<string>()
  const serializedFolders: Array<{
    dirName: string
    folder: HoppCollection
  }> = []
  for (const folder of collection.folders ?? []) {
    const dirName = getUniqueName(
      folder.name,
      folder._ref_id || folder.id,
      usedSubFolderNames
    )
    serializedFolders.push({ dirName, folder })
  }

  // 1. Write collection metadata (_collection.json)
  const meta: SerializedCollectionMeta = {
    v: collection.v ?? 12,
    name: collection.name,
    _ref_id: collection._ref_id,
    auth: sanitizeAuthForExport(collection.auth),
    headers: collection.headers,
    variables: collection.variables,
    description: collection.description ?? null,
    preRequestScript: collection.preRequestScript ?? "",
    testScript: collection.testScript ?? "",
    order: {
      folders: serializedFolders.map((f) => f.dirName),
      requests: serializedRequests.map((r) => r.fileName),
    },
  }
  await writeJsonFile(colDir, "_collection.json", meta)

  // Track expected files/folders for stale cleanup
  const expectedFiles = new Set<string>(["_collection.json"])
  const expectedFolders = new Set<string>()

  // 2. Write individual request JSON files
  for (const { fileName, req } of serializedRequests) {
    expectedFiles.add(fileName)
    await writeJsonFile(colDir, fileName, req)
  }

  // 3. Recursively serialize subfolders
  for (const { dirName, folder } of serializedFolders) {
    expectedFolders.add(dirName)
    await serializeCollectionToDir(folder, colDir, dirName)
  }

  // 4. Prune stale requests or deleted subfolders
  try {
    const existingEntries = await getDirectoryEntries(colDir)
    for (const entry of existingEntries) {
      if (entry.kind === "file") {
        if (entry.name.endsWith(".json") && !expectedFiles.has(entry.name)) {
          await colDir.removeEntry(entry.name)
        }
      } else if (entry.kind === "directory") {
        if (!entry.name.startsWith(".") && !expectedFolders.has(entry.name)) {
          await colDir.removeEntry(entry.name, { recursive: true })
        }
      }
    }
  } catch {
    // Non-fatal if directory entry pruning cannot complete
  }
}

/**
 * Deserializes a collection directory containing _collection.json and request JSONs
 */
export async function deserializeCollectionFromDir(
  colDir: FileSystemDirectoryHandle
): Promise<HoppCollection> {
  const entries = await getDirectoryEntries(colDir)

  // 1. Read metadata
  let meta: SerializedCollectionMeta = {
    v: 12,
    name: colDir.name,
  }

  const metaEntry = entries.find(
    (e) => e.kind === "file" && e.name === "_collection.json"
  ) as FileSystemFileHandle | undefined

  if (metaEntry) {
    const parsedMeta = await readJsonFile<SerializedCollectionMeta>(metaEntry)
    if (parsedMeta) {
      meta = parsedMeta
    }
  }

  // 2. Read requests (both REST and GraphQL)
  const requests: (HoppRESTRequest | HoppGQLRequest)[] = []
  const requestFiles = entries.filter(
    (e) =>
      e.kind === "file" &&
      e.name.endsWith(".json") &&
      e.name !== "_collection.json"
  ) as FileSystemFileHandle[]

  for (const reqFile of requestFiles) {
    const parsed = await readJsonFile(reqFile)
    if (parsed) {
      const item =
        typeof parsed === "object" &&
        "query" in parsed &&
        "url" in parsed &&
        !("endpoint" in parsed)
          ? translateToGQLRequest(parsed)
          : translateToNewRequest(parsed)
      ;(item as any)._diskFileName = reqFile.name
      requests.push(item)
    }
  }

  // 3. Read subfolders
  const folders: HoppCollection[] = []
  const subDirs = entries.filter(
    (e) => e.kind === "directory" && !e.name.startsWith(".")
  ) as FileSystemDirectoryHandle[]

  for (const subDir of subDirs) {
    const subCol = await deserializeCollectionFromDir(subDir)
    ;(subCol as any)._diskDirName = subDir.name
    folders.push(subCol)
  }

  // 4. Preserve collection ordering based on order metadata
  if (meta.order?.requests) {
    const orderMap = new Map<string, number>()
    meta.order.requests.forEach((name, idx) => orderMap.set(name, idx))
    requests.sort((a, b) => {
      const keyA = (a as any)._diskFileName || a.name
      const keyB = (b as any)._diskFileName || b.name
      const idxA = orderMap.has(keyA)
        ? orderMap.get(keyA)!
        : (orderMap.get(a.name) ?? 9999)
      const idxB = orderMap.has(keyB)
        ? orderMap.get(keyB)!
        : (orderMap.get(b.name) ?? 9999)
      return idxA - idxB
    })
  }
  for (const r of requests) {
    delete (r as any)._diskFileName
  }

  if (meta.order?.folders) {
    const orderMap = new Map<string, number>()
    meta.order.folders.forEach((name, idx) => orderMap.set(name, idx))
    folders.sort((a, b) => {
      const keyA = (a as any)._diskDirName || a.name
      const keyB = (b as any)._diskDirName || b.name
      const idxA = orderMap.has(keyA)
        ? orderMap.get(keyA)!
        : (orderMap.get(a.name) ?? 9999)
      const idxB = orderMap.has(keyB)
        ? orderMap.get(keyB)!
        : (orderMap.get(b.name) ?? 9999)
      return idxA - idxB
    })
  }
  for (const f of folders) {
    delete (f as any)._diskDirName
  }

  return makeCollection({
    name: meta.name ?? colDir.name,
    _ref_id: meta._ref_id,
    auth: meta.auth ?? { authType: "inherit", authActive: false },
    headers: meta.headers ?? [],
    variables: meta.variables ?? [],
    description: meta.description ?? null,
    preRequestScript: meta.preRequestScript ?? "",
    testScript: meta.testScript ?? "",
    folders,
    requests,
  })
}

/**
 * Serializes all Hoppscotch collections into the root directory handle (.hoppscotch/collections)
 */
export async function serializeAllCollectionsToDir(
  collections: HoppCollection[],
  rootDir: FileSystemDirectoryHandle
): Promise<void> {
  const collectionsDir = await resolveCollectionsDirectory(rootDir, true)
  const expectedDirs = new Set<string>()
  const usedColNames = new Set<string>(["_order.json", "_order"])

  const serializedRoots: Array<{ dirName: string; col: HoppCollection }> = []
  for (const col of collections) {
    const dirName = getUniqueName(col.name, col._ref_id || col.id, usedColNames)
    serializedRoots.push({ dirName, col })
    expectedDirs.add(dirName)
  }

  // Save deterministic top-level collection order using unique directory names
  const rootOrderMeta: RootOrderMeta = {
    order: serializedRoots.map((r) => r.dirName),
  }
  await writeJsonFile(collectionsDir, "_order.json", rootOrderMeta)

  for (const { dirName, col } of serializedRoots) {
    await serializeCollectionToDir(col, collectionsDir, dirName)
  }

  // Clean up deleted collections from disk
  try {
    const existingEntries = await getDirectoryEntries(collectionsDir)
    for (const entry of existingEntries) {
      if (entry.kind === "directory" && !entry.name.startsWith(".")) {
        if (!expectedDirs.has(entry.name)) {
          await collectionsDir.removeEntry(entry.name, { recursive: true })
        }
      }
    }
  } catch {
    // Non-fatal
  }
}

/**
 * Deserializes all collections found inside (.hoppscotch/collections)
 */
export async function deserializeAllCollectionsFromDir(
  rootDir: FileSystemDirectoryHandle
): Promise<HoppCollection[] | null> {
  let collectionsDir: FileSystemDirectoryHandle
  try {
    collectionsDir = await resolveCollectionsDirectory(rootDir, false)
  } catch {
    return null
  }

  const entries = await getDirectoryEntries(collectionsDir)
  const collections: HoppCollection[] = []

  // Read top-level ordering if available
  let rootOrder: string[] | null = null
  const orderEntry = entries.find(
    (e) => e.kind === "file" && e.name === "_order.json"
  ) as FileSystemFileHandle | undefined

  if (orderEntry) {
    try {
      const orderMeta = await readJsonFile<RootOrderMeta>(orderEntry)
      if (orderMeta && Array.isArray(orderMeta.order)) {
        rootOrder = orderMeta.order
      }
    } catch {
      // Fall back to un-ordered if _order.json is unreadable
    }
  }

  const dirEntries = entries.filter(
    (e) => e.kind === "directory" && !e.name.startsWith(".")
  ) as FileSystemDirectoryHandle[]

  for (const dir of dirEntries) {
    const col = await deserializeCollectionFromDir(dir)
    ;(col as any)._diskDirName = dir.name
    collections.push(col)
  }

  if (rootOrder) {
    const orderMap = new Map<string, number>()
    rootOrder.forEach((name, idx) => orderMap.set(name, idx))
    collections.sort((a, b) => {
      const keyA = (a as any)._diskDirName || a.name
      const keyB = (b as any)._diskDirName || b.name
      const idxA = orderMap.has(keyA)
        ? orderMap.get(keyA)!
        : (orderMap.get(a.name) ?? 9999)
      const idxB = orderMap.has(keyB)
        ? orderMap.get(keyB)!
        : (orderMap.get(b.name) ?? 9999)
      return idxA - idxB
    })
  }
  for (const c of collections) {
    delete (c as any)._diskDirName
  }

  return collections
}

/**
 * Preserves local account IDs and credentials for existing collections and requests matching by _ref_id or name
 */
export function preserveExistingLocalIds(
  newCollections: HoppCollection[],
  existingCollections: HoppCollection[]
): HoppCollection[] {
  const existingMap = new Map<
    string,
    {
      id?: string
      auth?: any
      reqIds: Map<string, { id?: string; auth?: any }>
    }
  >()

  const indexCollections = (cols: HoppCollection[]) => {
    for (const col of cols) {
      const key = col._ref_id || col.name
      const reqIds = new Map<string, { id?: string; auth?: any }>()
      for (const req of col.requests ?? []) {
        const reqKey = req._ref_id || req.name
        reqIds.set(reqKey, {
          id: (req as any).id,
          auth: (req as any).auth,
        })
      }
      existingMap.set(key, { id: col.id, auth: col.auth, reqIds })
      if (col.folders?.length) {
        indexCollections(col.folders)
      }
    }
  }

  indexCollections(existingCollections)

  const reattach = (cols: HoppCollection[]): HoppCollection[] => {
    return cols.map((col) => {
      const key = col._ref_id || col.name
      const existing = existingMap.get(key)
      const preservedId = existing?.id

      let resolvedAuth = col.auth
      if (existing?.auth && existing.auth.authType === col.auth?.authType) {
        resolvedAuth = existing.auth
      }

      const preservedRequests = (col.requests ?? []).map((req) => {
        const reqKey = req._ref_id || req.name
        const existingReq = existing?.reqIds.get(reqKey)
        const reqId = existingReq?.id
        let reqAuth = (req as any).auth
        if (
          existingReq?.auth &&
          existingReq.auth.authType === reqAuth?.authType
        ) {
          reqAuth = existingReq.auth
        }
        return {
          ...req,
          ...(reqId ? { id: reqId } : {}),
          ...(reqAuth ? { auth: reqAuth } : {}),
        }
      })

      const preservedFolders = col.folders ? reattach(col.folders) : []

      return {
        ...col,
        ...(preservedId ? { id: preservedId } : {}),
        ...(resolvedAuth ? { auth: resolvedAuth } : {}),
        requests: preservedRequests,
        folders: preservedFolders,
      }
    })
  }

  return reattach(newCollections)
}

/**
 * Merges repository collections with existing browser collections upon connecting
 * to ensure non-empty local collections are not discarded.
 */
export function mergeRepositoryWithLocal(
  repoCollections: HoppCollection[],
  localCollections: HoppCollection[]
): HoppCollection[] {
  const isDefaultEmpty =
    localCollections.length === 0 ||
    (localCollections.length === 1 &&
      localCollections[0].name === "My Collection" &&
      (localCollections[0].requests?.length ?? 0) === 0 &&
      (localCollections[0].folders?.length ?? 0) === 0)

  if (isDefaultEmpty) {
    return repoCollections
  }

  const repoNames = new Set<string>()
  for (const c of repoCollections) {
    if (c._ref_id) repoNames.add(c._ref_id)
    repoNames.add(c.name.toLowerCase())
  }

  const localOnly = localCollections.filter((c) => {
    const hasRef = c._ref_id && repoNames.has(c._ref_id)
    const hasName = repoNames.has(c.name.toLowerCase())
    return !hasRef && !hasName
  })

  return [...repoCollections, ...localOnly]
}

/**
 * Service to orchestrate native local folder / Git sync
 */
export class LocalSyncService extends Service {
  public static readonly ID = "LOCAL_SYNC_SERVICE"

  public readonly isSupported = ref<boolean>(
    typeof window !== "undefined" && "showDirectoryPicker" in window
  )

  public readonly isConnected = ref<boolean>(false)
  public readonly directoryName = ref<string | null>(null)
  public readonly isSyncing = ref<boolean>(false)
  public readonly syncStatus = ref<LocalSyncStatus>("disconnected")
  public readonly lastSyncedAt = ref<Date | null>(null)
  public readonly autoSync = ref<boolean>(true)
  public readonly syncError = ref<string | null>(null)

  private directoryHandle: FileSystemDirectoryHandle | null = null
  private isInternalUpdate = false
  private hasPendingExport = false
  private hasPendingLocalChange = false
  private storeSub: Subscription | null = null
  private onWindowFocus: (() => void) | null = null

  constructor(c: Container) {
    super(c)
    this.init()
  }

  private async init(): Promise<void> {
    if (!this.isSupported.value) return

    // Restore persistent handle from IndexedDB
    try {
      const savedHandle = await getHandleFromIDB()
      if (savedHandle) {
        // Verify browser permission
        const permission = await (savedHandle as any).queryPermission?.({
          mode: "readwrite",
        })
        if (permission === "granted") {
          this.directoryHandle = savedHandle
          this.directoryName.value = savedHandle.name
          this.isConnected.value = true
          this.syncStatus.value = "connected"

          // Read and reconcile disk before enabling automatic writes
          await this.checkForExternalUpdates()
        }
      }
    } catch {
      // Permission check failed or handle expired
    }

    // Subscribe to collection changes with debounce for auto-sync
    this.storeSub = restCollections$
      .pipe(
        skip(1),
        filter(() => !this.isInternalUpdate),
        tap(() => {
          if (this.isConnected.value) {
            this.hasPendingLocalChange = true
          }
        }),
        debounceTime(1200)
      )
      .subscribe(() => {
        this.hasPendingLocalChange = false
        if (this.autoSync.value && this.isConnected.value) {
          this.exportToDirectory()
        }
      })

    // Listen for window focus to detect branch switches / git pulls
    if (typeof window !== "undefined") {
      this.onWindowFocus = () => {
        if (
          this.isConnected.value &&
          !this.isSyncing.value &&
          this.autoSync.value
        ) {
          if (this.hasPendingLocalChange) {
            this.hasPendingLocalChange = false
            this.exportToDirectory()
          } else {
            this.checkForExternalUpdates()
          }
        }
      }
      window.addEventListener("focus", this.onWindowFocus)
    }
  }

  public destroy(): void {
    if (this.storeSub) {
      this.storeSub.unsubscribe()
      this.storeSub = null
    }

    if (typeof window !== "undefined" && this.onWindowFocus) {
      window.removeEventListener("focus", this.onWindowFocus)
      this.onWindowFocus = null
    }
  }

  /**
   * Prompts user with native folder picker and connects directory
   */
  public async connect(): Promise<boolean> {
    if (!this.isSupported.value) {
      this.syncError.value =
        "File System Access API is not supported in this browser"
      return false
    }

    try {
      this.isSyncing.value = true
      this.syncError.value = null

      const handle = await (window as any).showDirectoryPicker({
        mode: "readwrite",
      })

      // Verify or request readwrite permission
      const status = await handle.requestPermission({ mode: "readwrite" })
      if (status !== "granted") {
        this.syncError.value = "Permission to read/write directory was denied"
        this.isSyncing.value = false
        return false
      }

      this.directoryHandle = handle
      this.directoryName.value = handle.name

      // Check if folder contains existing Hoppscotch collections
      const existingCollections = await deserializeAllCollectionsFromDir(handle)
      const currentMemory = restCollectionStore.value.state

      let syncSuccess = false
      if (existingCollections && existingCollections.length > 0) {
        // Disk already has collections: merge to preserve non-empty local-only collections
        const merged = mergeRepositoryWithLocal(
          existingCollections,
          currentMemory
        )
        const reconciled = preserveExistingLocalIds(merged, currentMemory)
        this.isInternalUpdate = true
        setRESTCollections(reconciled)
        this.isInternalUpdate = false
        syncSuccess = true
        this.lastSyncedAt.value = new Date()
        this.syncStatus.value = "connected"
      } else {
        // Folder is empty or uninitialized: export memory collections to disk
        syncSuccess = await this.exportToDirectory()
      }

      if (!syncSuccess) {
        this.directoryHandle = null
        this.directoryName.value = null
        this.isConnected.value = false
        this.syncStatus.value = "error"
        this.isSyncing.value = false
        return false
      }

      this.isConnected.value = true
      this.syncStatus.value = "connected"
      await saveHandleToIDB(handle)

      this.isSyncing.value = false
      return true
    } catch (err: any) {
      this.directoryHandle = null
      this.directoryName.value = null
      this.isConnected.value = false
      if (err.name !== "AbortError") {
        this.syncError.value = err.message || "Failed to select directory"
        this.syncStatus.value = "error"
      }
      this.isSyncing.value = false
      return false
    }
  }

  /**
   * Disconnects local directory and removes stored handle
   */
  public async disconnect(): Promise<void> {
    this.directoryHandle = null
    this.directoryName.value = null
    this.isConnected.value = false
    this.syncStatus.value = "disconnected"
    this.syncError.value = null
    this.hasPendingLocalChange = false
    this.hasPendingExport = false
    await removeHandleFromIDB()
  }

  /**
   * Exports in-memory collections to the connected folder
   */
  public async exportToDirectory(): Promise<boolean> {
    if (!this.directoryHandle) return false

    // If already syncing, queue a trailing export and wait for active sync to finish
    if (this.isSyncing.value) {
      this.hasPendingExport = true
      return true
    }

    try {
      this.isSyncing.value = true
      this.syncStatus.value = "syncing"
      this.syncError.value = null

      let hasNext = true
      while (hasNext) {
        this.hasPendingExport = false
        const collections = restCollectionStore.value.state
        await serializeAllCollectionsToDir(collections, this.directoryHandle)
        this.hasPendingLocalChange = false
        hasNext = this.hasPendingExport
      }

      this.lastSyncedAt.value = new Date()
      this.syncStatus.value = "connected"
      return true
    } catch (err: any) {
      this.syncError.value =
        err.message || "Failed to export collections to directory"
      this.syncStatus.value = "error"
      return false
    } finally {
      this.isSyncing.value = false
      this.hasPendingLocalChange = false
      this.hasPendingExport = false
    }
  }

  /**
   * Imports collections from the connected folder into in-memory store
   */
  public async importFromDirectory(): Promise<boolean> {
    if (!this.directoryHandle) return false

    try {
      this.isSyncing.value = true
      this.syncStatus.value = "syncing"
      this.syncError.value = null

      const collections = await deserializeAllCollectionsFromDir(
        this.directoryHandle
      )
      if (collections !== null) {
        const memoryCollections = restCollectionStore.value.state
        const reconciled = preserveExistingLocalIds(
          collections,
          memoryCollections
        )
        this.isInternalUpdate = true
        setRESTCollections(reconciled)
        this.isInternalUpdate = false
      }

      this.lastSyncedAt.value = new Date()
      this.syncStatus.value = "connected"
      return true
    } catch (err: any) {
      this.syncError.value =
        err.message || "Failed to import collections from directory"
      this.syncStatus.value = "error"
      return false
    } finally {
      this.isSyncing.value = false
    }
  }

  /**
   * Performs full bi-directional sync (external pull check followed by push)
   */
  public async syncNow(): Promise<boolean> {
    if (!this.directoryHandle) return false
    await this.checkForExternalUpdates()
    return await this.exportToDirectory()
  }

  /**
   * Checks if collections in connected folder have changed (e.g. after git pull)
   */
  public async checkForExternalUpdates(): Promise<void> {
    if (!this.directoryHandle || this.isSyncing.value) return

    try {
      const diskCollections = await deserializeAllCollectionsFromDir(
        this.directoryHandle
      )
      if (diskCollections === null) return

      const memoryCollections = restCollectionStore.value.state
      const reconciled = preserveExistingLocalIds(
        diskCollections,
        memoryCollections
      )
      const diskJson = JSON.stringify(reconciled)
      const memJson = JSON.stringify(memoryCollections)

      if (diskJson !== memJson) {
        // Differences detected between disk and memory: re-sync from disk
        this.isInternalUpdate = true
        setRESTCollections(reconciled)
        this.isInternalUpdate = false
        this.lastSyncedAt.value = new Date()
      }
    } catch {
      // Non-fatal background check
    }
  }
}
