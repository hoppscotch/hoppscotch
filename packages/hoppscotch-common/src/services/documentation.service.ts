import { Service } from "dioc"
import { reactive, computed, ref } from "vue"
import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"
import {
  getUserPublishedDocs,
  getTeamPublishedDocs,
} from "~/helpers/backend/queries/PublishedDocs"
import * as E from "fp-ts/Either"

// Types for documentation
export type DocumentationType = "collection" | "request"

// Published documentation info
export interface PublishedDocInfo {
  id: string
  title: string
  version: string
  autoSync: boolean
  url: string
  environmentName?: string | null
  environmentID?: string | null
  collection: {
    id: string
  }
  createdOn: string
  updatedOn: string
}

/**
 * Base documentation item with common properties
 */
export interface BaseDocumentationItem {
  id: string
  documentation: string
  isTeamItem: boolean
  teamID?: string
}

/**
 * Collection documentation item
 */
export interface CollectionDocumentationItem extends BaseDocumentationItem {
  type: "collection"

  /**
   * The path (for personal collections) or ID (for team collections) of the collection
   */
  pathOrID: string
  collectionData: HoppCollection
}

/**
 * Request documentation item (supports both team and personal requests)
 */
export interface RequestDocumentationItem extends BaseDocumentationItem {
  type: "request"
  parentCollectionID: string
  folderPath: string
  requestID?: string // For team requests
  requestIndex?: number // For personal requests
  requestData: HoppRESTRequest
}

export type DocumentationItem =
  | CollectionDocumentationItem
  | RequestDocumentationItem

/**
 * Base options for setting documentation
 */
export interface BaseDocumentationOptions {
  isTeamItem: boolean
  teamID?: string
}

/**
 * Options for setting collection documentation
 */
export interface SetCollectionDocumentationOptions extends BaseDocumentationOptions {
  /**
   * The path (for personal collections) or ID (for team collections) of the collection
   */
  pathOrID: string
  collectionData: HoppCollection
}

/**
 * Request documentation
 */
export interface SetRequestDocumentationOptions extends BaseDocumentationOptions {
  parentCollectionID: string
  folderPath: string
  requestID?: string // For team requests
  requestIndex?: number // For personal requests
  requestData: HoppRESTRequest
}

/**
 * Checks whether a published doc version is the live (current) version.
 * A live version is auto-synced, has the CURRENT version identifier,
 * or has version 1.0.0 (used in older versions of the project).
 * This version is in sync with the particular collection and will update if the collection is updated.
 */
export const isLiveVersion = (doc: {
  autoSync: boolean
  version: string
}): boolean =>
  doc.autoSync &&
  (doc.version.toUpperCase() === "CURRENT" || doc.version === "1.0.0")

/**
 * This service manages edited documentation for collections and requests.
 * It temporarily stores the edited documentation in a map for efficient saving.
 * So that multiple edits can be batched together.
 */
export class DocumentationService extends Service {
  public static readonly ID = "DOCUMENTATION_SERVICE"

  private editedDocumentation = reactive(new Map<string, DocumentationItem>())

  /**
   * Computed property to check if there are any unsaved changes
   */
  public hasChanges = computed(() => this.editedDocumentation.size > 0)

  /**
   * Map to store published docs
   */
  private publishedDocsMap = ref<Map<string, PublishedDocInfo[]>>(new Map())

  /**
   * Counter to track the latest fetch request ID
   * This prevents race conditions where a stale request overwrites a newer one
   */
  private fetchRequestId = 0

  /**
   * Sets collection documentation
   */
  public setCollectionDocumentation(
    id: string,
    documentation: string,
    options: SetCollectionDocumentationOptions
  ): void {
    const key = `collection_${id}`
    const item: CollectionDocumentationItem = {
      type: "collection",
      id,
      documentation,
      isTeamItem: options.isTeamItem,
      teamID: options.teamID,
      pathOrID: options.pathOrID,
      collectionData: options.collectionData,
    }

    this.editedDocumentation.set(key, item)
  }

  /**
   * Sets request documentation
   */
  public setRequestDocumentation(
    id: string,
    documentation: string,
    options: SetRequestDocumentationOptions
  ): void {
    const key = `request_${id}`
    const item: RequestDocumentationItem = {
      type: "request",
      id,
      documentation,
      isTeamItem: options.isTeamItem,
      teamID: options.teamID,
      parentCollectionID: options.parentCollectionID,
      folderPath: options.folderPath,
      requestID: options.requestID, // Will be defined for team requests
      requestIndex: options.requestIndex, // Will be defined for personal requests
      requestData: options.requestData,
    }

    this.editedDocumentation.set(key, item)
  }

  /**
   * Gets the documentation for a collection or request
   * @param type The type of item ('collection' or 'request')
   * @param id The ID of the collection or request
   * @returns The documentation content or undefined if not found
   */
  public getDocumentation(
    type: DocumentationType,
    id: string
  ): string | undefined {
    const key = `${type}_${id}`
    const stored = this.editedDocumentation.get(key)
    return stored?.documentation
  }

  /**
   * Gets the parent collection ID for a request documentation item
   * @param id The ID of the request
   * @returns The parent collection ID or undefined if not found or not a request
   */
  public getParentCollectionID(id: string): string | undefined {
    const key = `request_${id}`
    const stored = this.editedDocumentation.get(key)

    if (stored?.type === "request") {
      return stored.parentCollectionID
    }

    return undefined
  }

  /**
   * Gets the complete documentation item with all metadata
   * @param type The type of item ('collection' or 'request')
   * @param id The ID of the collection or request
   * @returns The complete documentation item or undefined if not found
   */
  public getDocumentationItem(
    type: DocumentationType,
    id: string
  ): DocumentationItem | undefined {
    const key = `${type}_${id}`
    return this.editedDocumentation.get(key)
  }

  /**
   * Gets all changed items as an array
   * @returns Array of all items with changes
   */
  public getChangedItems(): DocumentationItem[] {
    return Array.from(this.editedDocumentation.values())
  }

  /**
   * Clears all edited documentation
   */
  public clearAll(): void {
    this.editedDocumentation.clear()
  }

  /**
   * Removes a specific item from the edited documentation
   * @param type The type of item ('collection' or 'request')
   * @param id The ID of the collection or request
   */
  public removeItem(type: DocumentationType, id: string): void {
    const key = `${type}_${id}`
    this.editedDocumentation.delete(key)
  }

  /**
   * Checks if a specific item has changes
   * @param type The type of item ('collection' or 'request')
   * @param id The ID of the collection or request
   * @returns True if the item has changes
   */
  public hasItemChanges(type: DocumentationType, id: string): boolean {
    const key = `${type}_${id}`
    return this.editedDocumentation.has(key)
  }

  /**
   * Gets the count of items with changes
   * @returns Number of items with unsaved changes
   */
  public getChangesCount(): number {
    return this.editedDocumentation.size
  }

  /**
   * Fetches user published docs and updates the map
   */
  public async fetchUserPublishedDocs() {
    // Increment request ID to invalidate any previous pending requests
    const requestId = ++this.fetchRequestId

    try {
      const result = await getUserPublishedDocs()()

      // If a newer request has started, ignore this result
      if (requestId !== this.fetchRequestId) return

      if (E.isRight(result)) {
        const docs = result.right
        const newMap = new Map<string, PublishedDocInfo[]>()
        docs.forEach((doc) => {
          if (doc.collection?.id) {
            const existing = newMap.get(doc.collection.id) || []
            existing.push({
              id: doc.id,
              title: doc.title,
              version: doc.version,
              autoSync: doc.autoSync,
              url: doc.url,
              collection: {
                id: doc.collection.id,
              },
              createdOn: doc.createdOn,
              updatedOn: doc.updatedOn,
            })
            newMap.set(doc.collection.id, existing)
          }
        })
        this.publishedDocsMap.value = newMap
      } else {
        console.error("Failed to fetch user published docs:", result.left)
      }
    } catch (error) {
      // If a newer request has started, ignore this error
      if (requestId !== this.fetchRequestId) return
      console.error("Failed to fetch user published docs:", error)
    }
  }

  /**
   * Fetches published docs for team collections
   */
  public async fetchTeamPublishedDocs(teamID: string) {
    // Increment request ID to invalidate any previous pending requests
    const requestId = ++this.fetchRequestId

    try {
      // Fetch all published docs for the team (collectionID is optional now)
      const result = await getTeamPublishedDocs(teamID)()

      // If a newer request has started, ignore this result
      if (requestId !== this.fetchRequestId) return

      if (E.isRight(result)) {
        const docs = result.right
        const newMap = new Map<string, PublishedDocInfo[]>()
        docs.forEach((doc) => {
          if (doc.collection?.id) {
            const existing = newMap.get(doc.collection.id) || []
            existing.push({
              id: doc.id,
              title: doc.title,
              version: doc.version,
              autoSync: doc.autoSync,
              url: doc.url,
              collection: {
                id: doc.collection.id,
              },
              createdOn: doc.createdOn,
              updatedOn: doc.updatedOn,
            })
            newMap.set(doc.collection.id, existing)
          }
        })
        this.publishedDocsMap.value = newMap
      } else {
        console.error("Failed to fetch team published docs:", result.left)
      }
    } catch (error) {
      // If a newer request has started, ignore this error
      if (requestId !== this.fetchRequestId) return
      console.error("Failed to fetch team published docs:", error)
    }
  }

  /**
   * Gets the published status of a collection (returns all versions)
   * @param collectionId The ID of the collection
   */
  public getPublishedDocStatus(
    collectionId: string
  ): PublishedDocInfo[] | undefined {
    return this.publishedDocsMap.value.get(collectionId)
  }

  /**
   * Gets a specific published doc version for a collection
   * @param collectionId The ID of the collection
   * @param version The version string to find
   */
  public getPublishedDocByVersion(
    collectionId: string,
    version: string
  ): PublishedDocInfo | undefined {
    const docs = this.publishedDocsMap.value.get(collectionId)
    return docs?.find((doc) => doc.version === version)
  }

  /**
   * Manually updates the published status of a collection
   * @param collectionId The ID of the collection
   * @param info The new info (single doc) to add/update, or null to remove ALL docs for this collection (use carefully)
   * @param removeId Optional ID to remove specifically
   */
  public setPublishedDocStatus(
    collectionId: string,
    info: PublishedDocInfo | null,
    removeId?: string
  ) {
    if (info && removeId) {
      throw new Error(
        "setPublishedDocStatus: Cannot provide both 'info' and 'removeId'. Please call separately."
      )
    }

    const newMap = new Map(this.publishedDocsMap.value)
    const existing = newMap.get(collectionId) || []

    if (removeId) {
      const filtered = existing.filter((doc) => doc.id !== removeId)
      if (filtered.length > 0) {
        newMap.set(collectionId, filtered)
      } else {
        newMap.delete(collectionId)
      }
    } else if (info) {
      // Update or add
      const updated = [...existing]
      const index = updated.findIndex((doc) => doc.id === info.id)
      if (index !== -1) {
        updated[index] = info
      } else {
        updated.push(info)
      }
      newMap.set(collectionId, updated)
    } else {
      // Remove all if info is null and no removeId
      newMap.delete(collectionId)
    }
    this.publishedDocsMap.value = newMap
  }
}
