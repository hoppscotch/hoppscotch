import { Service } from "dioc"
import { openLegitFs } from "@legit-sdk/core"
import { FsaNodeFs } from "@jsonjoy.com/fs-fsa-to-node"
import { HoppCollection, makeCollection } from "@hoppscotch/data"
import { ref, readonly } from "vue"

// Type declarations for File System Access API
declare global {
  interface Window {
    showDirectoryPicker: () => Promise<FileSystemDirectoryHandle>
  }
}

interface FileSystemDirectoryHandle {
  name: string
  kind: "directory"
  getFileHandle(
    name: string,
    options?: { create?: boolean }
  ): Promise<FileSystemFileHandle>
  [Symbol.asyncIterator]: () => AsyncIterableIterator<
    [string, FileSystemHandle]
  >
}

interface FileSystemFileHandle {
  getFile(): Promise<File>
  createWritable(): Promise<FileSystemWritableFileStream>
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: string | BufferSource | Blob): Promise<void>
  close(): Promise<void>
}

/**
 * Service that manages versioned filesystem access for collections
 */
export class VersionedFSService extends Service {
  public static readonly ID = "VERSIONED_FS_SERVICE"

  private legitFs: Awaited<ReturnType<typeof openLegitFs>> | null = null
  private collectionsPath = "rest-collections.json"
  private directoryHandle: FileSystemDirectoryHandle | null = null

  // Shared reactive state for unapplied changes
  private _hasUnappliedChanges = ref(false)
  public readonly unappliedChangesStatus = readonly(this._hasUnappliedChanges)

  /**
   * Get the current directory handle
   */
  public getDirectoryHandle(): FileSystemDirectoryHandle | null {
    return this.directoryHandle
  }

  override async onServiceInit() {
    // Intentionally noop: legitFs is initialized only after the user selects a repository
  }

  /**
   * Initialize the versioned filesystem with a git repository folder and branch
   * @param folderHandle The directory handle for the git repository
   * @param branch The branch name to use
   */
  public async init(
    folderHandle: FileSystemDirectoryHandle,
    branch: string
  ): Promise<void> {
    // Lazily create legitFs on first init
    if (!this.legitFs) {
      try {
        // Wrap the picked FSA directory handle with a Node-style fs adapter
        // Adapter: wrap the FSA directory handle into a Node-style fs
        const storageFs = new FsaNodeFs(
          folderHandle as any
        ) as unknown as typeof import("node:fs")

        this.legitFs = await openLegitFs({
          storageFs,
          gitRoot: "",
          anonymousBranch: branch || "main",
        })
        console.log(
          "[VersionedFSService] legitFs created successfully:",
          this.legitFs
        )
        ;(window as any).legitFs = this.legitFs
      } catch (error) {
        console.error("[VersionedFSService] Failed to create legitFs:", error)
        throw error
      }
    }

    this.directoryHandle = folderHandle

    // check if collections branch exists
    const collectionsBranchName = `${branch}-collections`
    try {
      await this.legitFs.promises.readdir(
        `/.legit/branches/${collectionsBranchName}`
      )
    } catch (error) {
      console.log("collections branch does not exist, creating it")
      await this.legitFs.promises.mkdir(
        `/.legit/branches/${collectionsBranchName}`
      )
      await this.legitFs.promises.writeFile(".legit/reference-branch", branch)
    }
    // Set the branch using legitFs
    await this.legitFs.setCurrentBranch(collectionsBranchName)

    console.log(
      "[VersionedFSService] Initialization complete. Folder:",
      folderHandle.name,
      "Branch:",
      collectionsBranchName
    )

    try {
      console.log(
        `[VersionedFSService] Reading collections from legitFs at: ${this.collectionsPath}`
      )

      const fileContent = await this.legitFs.promises.readFile(
        this.collectionsPath,
        "utf-8"
      )

      // Parse JSON content
      const gitCollections = JSON.parse(fileContent) as HoppCollection[]

      console.log("gitCollections: ", gitCollections)

      // Lazy import to avoid circular dependency
      const { restCollectionStore, setRESTCollections } =
        await import("~/newstore/collections")

      // get collections from restCollectionStore
      const collections = restCollectionStore.value.state
      // enrich collections with gitCollections with spread operator
      collections.push(...gitCollections)
      // set collections to restCollectionStore
      setRESTCollections(collections)

      console.log(
        `[VersionedFSService] Successfully loaded collections from ${collections.length}`
      )
    } catch (error: any) {
      // File might not exist - create a new collection with repo folder name
      if (error.code === "ENOENT" || error.name === "NotFoundError") {
        console.log(
          `[VersionedFSService] Collections file not found, creating new collection with repo name: ${folderHandle.name}`
        )

        // Create a new collection named after the repo folder
        const handleKey = `git-${folderHandle.name}`
        const newCollection = makeCollection({
          name: folderHandle.name,
          description: handleKey,
          folders: [],
          requests: [],
          auth: {
            authType: "inherit",
            authActive: false,
          },
          headers: [],
          variables: [],
        })

        // Write the new collection to FSA
        await this.writeCollectionsToLegitFs([newCollection])

        // Lazy import to avoid circular dependency
        const { restCollectionStore, setRESTCollections } =
          await import("~/newstore/collections")

        // Get collections from restCollectionStore and add the new one
        const collections = restCollectionStore.value.state
        collections.push(newCollection)
        setRESTCollections(collections)

        // Refresh unapplied changes status after creating new collection
        await this.refreshUnappliedChangesStatus()

        console.log(
          `[VersionedFSService] Created new collection "${folderHandle.name}" and wrote to FSA`
        )
      } else {
        // Other errors should be thrown
        console.error(
          "[VersionedFSService] Failed to read collections from legitFs",
          error
        )
        throw error
      }
    }
  }

  /**
   * Check if there are unapplied changes in the collections branch
   * Returns true if there are changes that haven't been applied to the reference branch
   */
  public async hasUnappliedChanges(): Promise<boolean> {
    if (!this.legitFs) {
      return false
    }

    try {
      // Read reference branch from the collections branch or root
      let referenceBranch: string
      try {
        // Try reading from collections branch first
        const referenceBranchContent = await this.legitFs.promises.readFile(
          `/.legit/reference-branch`,
          "utf-8"
        )
        referenceBranch = referenceBranchContent.trim()
      } catch (error) {
        // If reference branch file doesn't exist in branch, try reading from root
        try {
          const referenceBranchContent = await this.legitFs.promises.readFile(
            ".legit/reference-branch",
            "utf-8"
          )
          referenceBranch = referenceBranchContent.trim()
        } catch {
          // If no reference branch found, assume no unapplied changes
          this._hasUnappliedChanges.value = false
          return false
        }
      }

      if (!referenceBranch) {
        this._hasUnappliedChanges.value = false
        return false
      }

      // Get collections branch head
      const collectionsHead = await this.legitFs.promises.readFile(
        "/.legit/head",
        "utf-8"
      )
      const collectionsHeadOID = collectionsHead.trim()

      // Get reference branch head
      const referenceBranchPath = `/.legit/branches/${referenceBranch}`
      const referenceHead = await this.legitFs.promises.readFile(
        `${referenceBranchPath}/.legit/head`,
        "utf-8"
      )
      const referenceHeadOID = referenceHead.trim()

      // Get the history from collections branch
      const historyPath = `/.legit/history`

      let history
      try {
        const historyContent = await this.legitFs.promises.readFile(
          historyPath,
          "utf-8"
        )
        history = JSON.parse(historyContent)
      } catch (error) {
        return true
      }

      // find head commit in history
      const headCommit = history.find(
        (commit: any) => commit.oid === collectionsHeadOID
      )
      if (!headCommit) {
        return true
      }

      // Check if the commit's parent array contains the reference branch head
      // If it does, all changes are applied
      const hasReferenceHeadAsParent =
        headCommit.parent?.includes(referenceHeadOID)

      // If reference head is in parents, changes are applied
      // Otherwise, there are unapplied changes
      const result = !hasReferenceHeadAsParent
      // Update shared state
      this._hasUnappliedChanges.value = result
      return result
    } catch (error) {
      console.error(
        "[VersionedFSService] Failed to check for unapplied changes:",
        error
      )
      // On error, assume no unapplied changes to avoid false positives
      this._hasUnappliedChanges.value = false
      return false
    }
  }

  /**
   * Refresh the unapplied changes status
   * Call this after operations that might change the status
   */
  public async refreshUnappliedChangesStatus(): Promise<void> {
    if (this.legitFs && this.directoryHandle) {
      await this.hasUnappliedChanges()
    }
  }

  /**
   * Get the legitFs instance
   */
  public getLegitFs() {
    console.log("[VersionedFSService] getLegitFs() called")
    return this.legitFs
  }

  /**
   * Get the current branch name (extracted from collections branch name)
   * Returns null if not initialized or if branch name cannot be determined
   */
  public async getCurrentBranchName(): Promise<string | null> {
    if (!this.legitFs) {
      return null
    }

    try {
      const currentBranch = await this.legitFs.getCurrentBranch()
      // Extract branch name from "main-collections" -> "main"
      if (currentBranch.endsWith("-collections")) {
        return currentBranch.slice(0, -"-collections".length)
      }
      return currentBranch
    } catch (error) {
      console.error(
        "[VersionedFSService] Failed to get current branch name:",
        error
      )
      return null
    }
  }

  /**
   * List all available branches (non-collections branches)
   * Returns an array of branch names
   */
  public async listAvailableBranches(): Promise<string[]> {
    if (!this.legitFs) {
      return []
    }

    try {
      const branchesDir = "/.legit/branches"
      const entries = await this.legitFs.promises.readdir(branchesDir)

      // Filter out collections branches and return base branch names
      const baseBranches = new Set<string>()
      for (const entry of entries) {
        if (entry.endsWith("-collections")) {
          const baseBranch = entry.slice(0, -"-collections".length)
          baseBranches.add(baseBranch)
        } else {
          // Also include non-collections branches
          baseBranches.add(entry)
        }
      }

      return Array.from(baseBranches).sort()
    } catch (error) {
      console.error(
        "[VersionedFSService] Failed to list available branches:",
        error
      )
      return []
    }
  }

  /**
   * Switch to a different branch
   * Creates the collections branch if it doesn't exist, then loads collections
   * @param branchName The base branch name (e.g., "main", "develop")
   */
  public async switchBranch(branchName: string): Promise<void> {
    if (!this.legitFs || !this.directoryHandle) {
      throw new Error("LegitFs is not initialized")
    }

    try {
      // Save current collections before switching
      const { restCollectionStore } = await import("~/newstore/collections")
      const gitCollections = restCollectionStore.value.state.filter(
        (collection: HoppCollection) =>
          collection.description?.startsWith("git-")
      )

      if (gitCollections.length > 0) {
        await this.writeCollectionsToLegitFs(gitCollections)
      }

      // Create or switch to the collections branch
      const collectionsBranchName = `${branchName}-collections`
      try {
        await this.legitFs.promises.readdir(
          `/.legit/branches/${collectionsBranchName}`
        )
      } catch (error: any) {
        if (error.code === "ENOENT" || error.name === "NotFoundError") {
          console.log(
            `[VersionedFSService] Collections branch does not exist, creating: ${collectionsBranchName}`
          )
          await this.legitFs.promises.mkdir(
            `/.legit/branches/${collectionsBranchName}`
          )
        } else {
          throw error
        }
      }

      // Switch to the collections branch
      await this.legitFs.setCurrentBranch(collectionsBranchName)

      console.log(
        `[VersionedFSService] Switched to branch: ${collectionsBranchName}`
      )

      // Load collections from the new branch
      await this.loadCollectionsFromLegitFsInStore()
      // Refresh unapplied changes status after switching
      await this.refreshUnappliedChangesStatus()
    } catch (error) {
      console.error("[VersionedFSService] Failed to switch branch:", error)
      throw error
    }
  }

  public async writeCollectionsToLegitFs(collections: HoppCollection[]) {
    try {
      if (!this.legitFs) {
        throw new Error("LegitFs is not initialized")
      }
      await this.legitFs.promises.writeFile(
        this.collectionsPath,
        JSON.stringify(collections, null, 2)
      )
    } catch (error) {
      console.error(
        "[VersionedFSService] Failed to write collections to legitFs",
        error
      )
      throw error
    }
  }

  public async loadCollectionsFromLegitFsInStore() {
    try {
      if (!this.legitFs || !this.directoryHandle) {
        console.log(
          "[VersionedFSService] Cannot load collections: legitFs or directoryHandle not initialized"
        )
        return
      }

      const fileContent = await this.legitFs.promises.readFile(
        this.collectionsPath,
        "utf-8"
      )

      // Lazy import to avoid circular dependency
      const { restCollectionStore, setRESTCollections } =
        await import("~/newstore/collections")

      const gitCollections = JSON.parse(fileContent) as HoppCollection[]

      // Ensure all git collections have the correct description (handle key)
      const handleKey = `git-${this.directoryHandle.name}`
      gitCollections.forEach((collection) => {
        collection.description = handleKey
      })

      // Get current collections from store (regular collections)
      const currentCollections = restCollectionStore.value.state

      // Remove any existing git collections (by description) to avoid duplicates
      const regularCollections = currentCollections.filter(
        (collection: HoppCollection) =>
          !collection.description?.startsWith("git-")
      )

      // Merge: regular collections + git collections from FSA (source of truth)
      const mergedCollections = [...regularCollections, ...gitCollections]

      // Update store with merged collections
      setRESTCollections(mergedCollections)

      // Refresh unapplied changes status after loading
      await this.refreshUnappliedChangesStatus()

      console.log(
        `[VersionedFSService] Loaded ${gitCollections.length} git collections from FSA and merged with ${regularCollections.length} regular collections`
      )
    } catch (error: any) {
      // File might not exist yet, which is okay
      if (error.code !== "ENOENT") {
        console.error(
          "[VersionedFSService] Failed to read collections from legitFs",
          error
        )
      } else {
        console.log(
          "[VersionedFSService] No collections file in FSA yet (this is normal for new repos)"
        )
      }
    }
  }
}
