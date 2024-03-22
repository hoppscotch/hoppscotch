import { Service } from "dioc"
import {
  SpotlightSearcher,
  SpotlightSearcherResult,
  SpotlightSearcherSessionState,
  SpotlightService,
} from ".."
import { getI18n } from "~/modules/i18n"
import { Ref, computed, effectScope, markRaw, watch } from "vue"
import { TeamSearchService } from "~/helpers/teams/TeamsSearch.service"
import { cloneDeep, debounce } from "lodash-es"
import IconFolder from "~icons/lucide/folder"
import { WorkspaceService } from "~/services/workspace.service"
import RESTTeamRequestEntry from "~/components/app/spotlight/entry/RESTTeamRequestEntry.vue"
import { RESTTabService } from "~/services/tab/rest"
import { HoppInheritedProperty } from "~/helpers/types/HoppInheritedProperties"
import { HoppRESTRequest } from "@hoppscotch/data"

export class TeamsSpotlightSearcherService
  extends Service
  implements SpotlightSearcher
{
  public static readonly ID = "TEAMS_SPOTLIGHT_SEARCHER_SERVICE"

  private t = getI18n()

  public searcherID = "teams"
  public searcherSectionTitle = this.t("team.search_title")

  private readonly spotlight = this.bind(SpotlightService)

  private readonly teamsSearch = this.bind(TeamSearchService)

  private readonly workspaceService = this.bind(WorkspaceService)

  private readonly tabs = this.bind(RESTTabService)

  constructor() {
    super()

    this.spotlight.registerSearcher(this)
  }

  createSearchSession(
    query: Readonly<Ref<string>>
  ): [Ref<SpotlightSearcherSessionState>, () => void] {
    const isTeamWorkspace = computed(
      () => this.workspaceService.currentWorkspace.value.type === "team"
    )

    const scopeHandle = effectScope()

    scopeHandle.run(() => {
      const debouncedSearch = debounce(this.teamsSearch.searchTeams, 400)

      watch(
        query,
        (query) => {
          if (this.workspaceService.currentWorkspace.value.type === "team") {
            const teamID = this.workspaceService.currentWorkspace.value.teamID
            debouncedSearch(query, teamID)?.catch(() => {})
          }
        },
        {
          immediate: true,
        }
      )

      // set the search section title based on the current workspace
      const teamName = computed(() => {
        return (
          (this.workspaceService.currentWorkspace.value.type === "team" &&
            this.workspaceService.currentWorkspace.value.teamName) ||
          this.t("team.search_title")
        )
      })

      watch(
        teamName,
        (newTeamName) => {
          this.searcherSectionTitle = newTeamName
        },
        {
          immediate: true,
        }
      )
    })

    const onSessionEnd = () => {
      scopeHandle.stop()
    }

    const resultObj = computed<SpotlightSearcherSessionState>(() => {
      return isTeamWorkspace.value
        ? {
            loading: this.teamsSearch.teamsSearchResultsLoading.value,
            results:
              this.teamsSearch.teamsSearchResultsFormattedForSpotlight.value.map(
                (result) => ({
                  id: result.request.id,
                  icon: markRaw(IconFolder),
                  score: 1, // make a better scoring system for this
                  text: {
                    type: "custom",
                    component: markRaw(RESTTeamRequestEntry),
                    componentProps: {
                      collectionTitles: result.collectionTitles,
                      request: result.request,
                    },
                  },
                })
              ),
          }
        : {
            loading: false,
            results: [],
          }
    })

    return [resultObj, onSessionEnd]
  }

  onResultSelect(result: SpotlightSearcherResult): void {
    let inheritedProperties: HoppInheritedProperty | undefined = undefined

    const selectedRequest = this.teamsSearch.searchResultsRequests[result.id]

    if (!selectedRequest) return

    const collectionID = result.id

    if (!collectionID) return

    inheritedProperties =
      this.teamsSearch.cascadeParentCollectionForHeaderAuthForSearchResults(
        collectionID
      )

    const possibleTab = this.tabs.getTabRefWithSaveContext({
      originLocation: "team-collection",
      requestID: result.id,
    })

    if (possibleTab) {
      this.tabs.setActiveTab(possibleTab.value.id)
    } else {
      this.tabs.createNewTab({
        request: cloneDeep(selectedRequest.request as HoppRESTRequest),
        isDirty: false,
        saveContext: {
          originLocation: "team-collection",
          requestID: selectedRequest.id,
          collectionID: selectedRequest.collectionID,
        },
        inheritedProperties: inheritedProperties,
      })
    }
  }
}
