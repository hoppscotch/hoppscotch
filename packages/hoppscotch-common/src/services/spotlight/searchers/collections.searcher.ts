import { Service } from "dioc"
import {
  SpotlightSearcher,
  SpotlightSearcherResult,
  SpotlightSearcherSessionState,
  SpotlightService,
} from "../"
import { Ref, computed, effectScope, markRaw, ref, watch } from "vue"
import { getI18n } from "~/modules/i18n"
import MiniSearch from "minisearch"
import {
  graphqlCollectionStore,
  restCollectionStore,
} from "~/newstore/collections"
import IconFolder from "~icons/lucide/folder"
import RESTRequestSpotlightEntry from "~/components/app/spotlight/entry/RESTRequest.vue"
import GQLRequestSpotlightEntry from "~/components/app/spotlight/entry/GQLRequest.vue"
import { createNewTab } from "~/helpers/rest/tab"
import { getTabRefWithSaveContext } from "~/helpers/rest/tab"
import { currentTabID } from "~/helpers/rest/tab"
import {
  HoppCollection,
  HoppGQLRequest,
  HoppRESTRequest,
} from "@hoppscotch/data"
import { setGQLSession } from "~/newstore/GQLSession"
import { cloneDeep } from "lodash-es"
import { hoppWorkspaceStore } from "~/newstore/workspace"
import { changeWorkspace } from "~/newstore/workspace"

/**
 * A spotlight searcher that searches through the user's collections
 *
 * NOTE: Initializing this service registers it as a searcher with the Spotlight Service.
 */
export class CollectionsSpotlightSearcherService
  extends Service
  implements SpotlightSearcher
{
  public static readonly ID = "COLLECTIONS_SPOTLIGHT_SEARCHER_SERVICE"

  private t = getI18n()

  public searcherID = "collections"
  public searcherSectionTitle = this.t("collection.my_collections")

  private readonly spotlight = this.bind(SpotlightService)

  constructor() {
    super()

    this.spotlight.registerSearcher(this)
  }

  private loadGQLDocsIntoMinisearch(minisearch: MiniSearch) {
    const gqlCollsQueue = [
      ...graphqlCollectionStore.value.state.map((coll, index) => ({
        coll: coll,
        index: `${index}`,
      })),
    ]

    while (gqlCollsQueue.length > 0) {
      const { coll, index } = gqlCollsQueue.shift()!

      gqlCollsQueue.push(
        ...coll.folders.map((folder, folderIndex) => ({
          coll: folder,
          index: `${index}/${folderIndex}`,
        }))
      )

      minisearch.addAll(
        coll.requests.map((req, reqIndex) => ({
          id: `gql-${index}/${reqIndex}`,
          name: req.name,
        }))
      )
    }
  }

  private loadRESTDocsIntoMinisearch(minisearch: MiniSearch) {
    const restDocsQueue = [
      ...restCollectionStore.value.state.map((coll, index) => ({
        coll: coll,
        index: `${index}`,
      })),
    ]

    while (restDocsQueue.length > 0) {
      const { coll, index } = restDocsQueue.shift()!

      restDocsQueue.push(
        ...coll.folders.map((folder, folderIndex) => ({
          coll: folder,
          index: `${index}/${folderIndex}`,
        }))
      )

      minisearch.addAll(
        coll.requests.map((req, reqIndex) => ({
          id: `rest-${index}/${reqIndex}`,
          name: req.name,
        }))
      )
    }
  }

  private getCurrentPageCategory() {
    // TODO: Better logic for this ?
    try {
      const url = new URL(window.location.href)

      if (url.pathname.startsWith("/graphql")) {
        return "graphql"
      } else if (url.pathname === "/") {
        return "rest"
      } else {
        return "other"
      }
    } catch (e) {
      return "other"
    }
  }

  public createSearchSession(
    query: Readonly<Ref<string>>
  ): [Ref<SpotlightSearcherSessionState>, () => void] {
    const pageCategory = this.getCurrentPageCategory()

    const minisearch = new MiniSearch({
      fields: ["name"],
      storeFields: ["name"],
      searchOptions: {
        prefix: true,
        fuzzy: true,
        boost: {
          name: 2,
        },
        weights: {
          fuzzy: 0.2,
          prefix: 0.8,
        },
      },
    })

    if (pageCategory === "rest") {
      this.loadRESTDocsIntoMinisearch(minisearch)
    } else if (pageCategory === "graphql") {
      this.loadGQLDocsIntoMinisearch(minisearch)
    }

    const results = ref<SpotlightSearcherResult[]>([])

    const scopeHandle = effectScope()

    scopeHandle.run(() => {
      watch(query, (query) => {
        if (pageCategory === "other") {
          results.value = []
          return
        }

        if (pageCategory === "rest") {
          const searchResults = minisearch.search(query).slice(0, 10)

          results.value = searchResults.map((result) => ({
            id: result.id,
            text: {
              type: "custom",
              component: markRaw(RESTRequestSpotlightEntry),
              componentProps: {
                folderPath: result.id.split("rest-")[1],
              },
            },
            icon: markRaw(IconFolder),
            score: result.score,
          }))
        } else {
          const searchResults = minisearch.search(query).slice(0, 10)

          results.value = searchResults.map((result) => ({
            id: result.id,
            text: {
              type: "custom",
              component: markRaw(GQLRequestSpotlightEntry),
              componentProps: {
                folderPath: result.id.split("gql-")[1],
              },
            },
            icon: markRaw(IconFolder),
            score: result.score,
          }))
        }
      })
    })

    const resultObj = computed<SpotlightSearcherSessionState>(() => ({
      loading: false,
      results: results.value,
    }))

    return [
      resultObj,
      () => {
        scopeHandle.stop()
      },
    ]
  }

  private getRESTFolderFromFolderPath(
    folderPath: string
  ): HoppCollection<HoppRESTRequest> | undefined {
    try {
      const folderIndicies = folderPath.split("/").map((x) => parseInt(x))

      let currentFolder =
        restCollectionStore.value.state[folderIndicies.shift()!]

      while (folderIndicies.length > 0) {
        const folderIndex = folderIndicies.shift()!

        const folder = currentFolder.folders[folderIndex]

        currentFolder = folder
      }

      return currentFolder
    } catch (e) {
      console.error(e)
      return undefined
    }
  }

  private getGQLFolderFromFolderPath(
    folderPath: string
  ): HoppCollection<HoppGQLRequest> | undefined {
    try {
      const folderIndicies = folderPath.split("/").map((x) => parseInt(x))

      let currentFolder =
        graphqlCollectionStore.value.state[folderIndicies.shift()!]

      while (folderIndicies.length > 0) {
        const folderIndex = folderIndicies.shift()!

        const folder = currentFolder.folders[folderIndex]

        currentFolder = folder
      }

      return currentFolder
    } catch (e) {
      console.error(e)
      return undefined
    }
  }

  public onResultSelect(result: SpotlightSearcherResult): void {
    const [type, path] = result.id.split("-")

    if (type === "rest") {
      const folderPath = path.split("/").map((x) => parseInt(x))
      const reqIndex = folderPath.pop()!

      if (hoppWorkspaceStore.value.workspace.type !== "personal") {
        changeWorkspace({
          type: "personal",
        })
      }

      const possibleTab = getTabRefWithSaveContext({
        originLocation: "user-collection",
        folderPath: folderPath.join("/"),
        requestIndex: reqIndex,
      })

      if (possibleTab) {
        currentTabID.value = possibleTab.value.id
      } else {
        const req = this.getRESTFolderFromFolderPath(folderPath.join("/"))
          ?.requests[reqIndex]

        if (!req) return

        createNewTab(
          {
            request: req,
            isDirty: false,
            saveContext: {
              originLocation: "user-collection",
              folderPath: folderPath.join("/"),
              requestIndex: reqIndex,
            },
          },
          true
        )
      }
    } else if (type === "gql") {
      const folderPath = path.split("/").map((x) => parseInt(x))
      const reqIndex = folderPath.pop()!

      const req = this.getGQLFolderFromFolderPath(folderPath.join("/"))
        ?.requests[reqIndex]

      if (!req) return

      setGQLSession({
        request: cloneDeep(req),
        schema: "",
        response: "",
      })
    }
  }
}
