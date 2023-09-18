import {
  Component,
  Ref,
  computed,
  effectScope,
  markRaw,
  reactive,
  ref,
  watch,
} from "vue"
import { invokeAction } from "~/helpers/actions"
import { getI18n } from "~/modules/i18n"
import {
  SpotlightSearcher,
  SpotlightSearcherResult,
  SpotlightSearcherSessionState,
  SpotlightService,
} from ".."
import {
  SearchResult,
  StaticSpotlightSearcherService,
} from "./base/static.searcher"

import { Service } from "dioc"
import * as E from "fp-ts/Either"
import MiniSearch from "minisearch"
import IconCheckCircle from "~/components/app/spotlight/entry/IconSelected.vue"
import { runGQLQuery } from "~/helpers/backend/GQLClient"
import { GetMyTeamsDocument, GetMyTeamsQuery } from "~/helpers/backend/graphql"
import { platform } from "~/platform"
import IconEdit from "~icons/lucide/edit"
import IconTrash2 from "~icons/lucide/trash-2"
import IconUser from "~icons/lucide/user"
import IconUserPlus from "~icons/lucide/user-plus"
import IconUsers from "~icons/lucide/users"
import { WorkspaceService } from "~/services/workspace.service"

type Doc = {
  text: string | string[]
  alternates: string[]
  icon: object | Component
  excludeFromSearch?: boolean
}

/**
 *
 * This searcher is responsible for providing team related actions on the spotlight results.
 *
 * NOTE: Initializing this service registers it as a searcher with the Spotlight Service.
 */
export class WorkspaceSpotlightSearcherService extends StaticSpotlightSearcherService<Doc> {
  public static readonly ID = "WORKSPACE_SPOTLIGHT_SEARCHER_SERVICE"

  private t = getI18n()

  public readonly searcherID = "workspace"
  public searcherSectionTitle = this.t("spotlight.workspace.title")

  private readonly spotlight = this.bind(SpotlightService)
  private readonly workspaceService = this.bind(WorkspaceService)

  private workspace = this.workspaceService.currentWorkspace

  private isTeamSelected = computed(
    () =>
      this.workspace.value.type === "team" &&
      this.workspace.value.teamID !== undefined
  )

  private documents: Record<string, Doc> = reactive({
    new_team: {
      text: [this.t("team.title"), this.t("spotlight.workspace.new")],
      alternates: ["new", "team", "workspace"],
      icon: markRaw(IconUsers),
    },
    edit_team: {
      text: [this.t("team.title"), this.t("spotlight.workspace.edit")],
      alternates: ["edit", "team", "workspace"],
      icon: markRaw(IconEdit),
      excludeFromSearch: computed(() => !this.isTeamSelected.value),
    },
    invite_members: {
      text: [this.t("team.title"), this.t("spotlight.workspace.invite")],
      alternates: ["invite", "members", "workspace"],
      icon: markRaw(IconUserPlus),
      excludeFromSearch: computed(() => !this.isTeamSelected.value),
    },
    delete_team: {
      text: [this.t("team.title"), this.t("spotlight.workspace.delete")],
      alternates: ["delete", "team", "workspace"],
      icon: markRaw(IconTrash2),
      excludeFromSearch: computed(() => !this.isTeamSelected.value),
    },
    switch_to_personal: {
      text: [
        this.t("team.title"),
        this.t("spotlight.workspace.switch_to_personal"),
      ],
      alternates: ["switch", "team", "workspace", "personal"],
      icon: markRaw(IconUser),
      excludeFromSearch: computed(() => !this.isTeamSelected.value),
    },
  })

  constructor() {
    super({
      searchFields: ["text", "alternates"],
      fieldWeights: {
        text: 2,
        alternates: 1,
      },
    })

    this.setDocuments(this.documents)
    this.spotlight.registerSearcher(this)
  }

  protected getSearcherResultForSearchResult(
    result: SearchResult<Doc>
  ): SpotlightSearcherResult {
    return {
      id: result.id,
      icon: result.doc.icon,
      text: { type: "text", text: result.doc.text },
      score: result.score,
    }
  }

  private deleteTeam(): void {
    if (this.workspace.value.type === "team")
      invokeAction(`modals.team.delete`, {
        teamId: this.workspace.value.teamID,
      })
  }

  public onDocSelected(id: string): void {
    if (id === "new_team") {
      if (platform.auth.getCurrentUser()) {
        invokeAction(`modals.team.new`)
      } else {
        invokeAction(`modals.login.toggle`)
      }
    } else if (id === "edit_team") invokeAction(`modals.team.edit`)
    else if (id === "invite_members") invokeAction(`modals.team.invite`)
    else if (id === "delete_team") this.deleteTeam()
    else if (id === "switch_to_personal")
      invokeAction(`workspace.switch.personal`)
  }
}

/**
 * This searcher is responsible for searching through the environment.
 * And switching between them.
 */
export class SwitchWorkspaceSpotlightSearcherService
  extends Service
  implements SpotlightSearcher
{
  public static readonly ID = "SWITCH_WORKSPACE_SPOTLIGHT_SEARCHER_SERVICE"

  private t = getI18n()

  public searcherID = "switch_workspace"
  public searcherSectionTitle = this.t("workspace.title")

  private readonly spotlight = this.bind(SpotlightService)
  private readonly workspaceService = this.bind(WorkspaceService)

  constructor() {
    super()

    this.spotlight.registerSearcher(this)
  }

  private fetchMyTeams(): Promise<GetMyTeamsQuery["myTeams"]> {
    return new Promise(async (resolve) => {
      const currentUser = platform.auth.getCurrentUser()
      if (!currentUser) return resolve([])

      const results: GetMyTeamsQuery["myTeams"] = []

      const result = await runGQLQuery({
        query: GetMyTeamsDocument,
        variables: {
          cursor:
            results.length > 0 ? results[results.length - 1].id : undefined,
        },
      })

      if (E.isRight(result)) results.push(...result.right.myTeams)
      resolve(results)
    })
  }

  private workspace = this.workspaceService.currentWorkspace

  createSearchSession(
    query: Readonly<Ref<string>>
  ): [Ref<SpotlightSearcherSessionState>, () => void] {
    const loading = ref(false)
    const results = ref<SpotlightSearcherResult[]>([])

    const minisearch = new MiniSearch({
      fields: ["name", "alternates"],
      storeFields: ["name"],
    })

    this.fetchMyTeams().then((teams) => {
      minisearch.addAll(
        teams.map((entry) => {
          let id = `workspace-${entry.id}`
          // if id matches add -selected to it
          if (
            this.workspace.value.type === "team" &&
            this.workspace.value.teamID === entry.id
          ) {
            id += "-selected"
          }
          return {
            id,
            name: entry.name,
            alternates: ["team", "workspace", "change", "switch"],
          }
        })
      )
    })

    const scopeHandle = effectScope()

    scopeHandle.run(() => {
      watch(
        [query],
        ([query]) => {
          results.value = minisearch
            .search(query, {
              prefix: true,
              fuzzy: true,
              boost: {
                reltime: 2,
              },
              weights: {
                fuzzy: 0.2,
                prefix: 0.8,
              },
            })
            .map((x) => {
              return {
                id: x.id,
                icon: markRaw(
                  x.id.endsWith("-selected") ? IconCheckCircle : IconUsers
                ),
                score: x.score,
                text: {
                  type: "text",
                  text: [this.t("workspace.change"), x.name],
                },
              }
            })
        },
        { immediate: true }
      )
    })

    const onSessionEnd = () => {
      scopeHandle.stop()
      minisearch.removeAll()
    }

    const resultObj = computed<SpotlightSearcherSessionState>(() => ({
      loading: loading.value,
      results: results.value,
    }))

    return [resultObj, onSessionEnd]
  }

  onResultSelect(result: SpotlightSearcherResult): void {
    invokeAction("workspace.switch", {
      teamId: result.id.split("-")[1],
    })
  }
}
