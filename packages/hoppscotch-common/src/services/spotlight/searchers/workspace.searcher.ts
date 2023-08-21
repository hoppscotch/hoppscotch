import { Component, computed, markRaw, reactive } from "vue"
import { invokeAction } from "~/helpers/actions"
import { getI18n } from "~/modules/i18n"
import { SpotlightSearcherResult, SpotlightService } from ".."
import {
  SearchResult,
  StaticSpotlightSearcherService,
} from "./base/static.searcher"

import IconEdit from "~icons/lucide/edit"
import IconTrash2 from "~icons/lucide/trash-2"
import IconUserPlus from "~icons/lucide/user-plus"
import IconUser from "~icons/lucide/user"
import IconUsers from "~icons/lucide/users"
import { useStreamStatic } from "~/composables/stream"
import { workspaceStatus$ } from "~/newstore/workspace"

type Doc = {
  text: string
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

  private workspace = useStreamStatic(
    workspaceStatus$,
    { type: "personal" },
    () => {}
  )[0]

  private isTeamSelected = computed(
    () =>
      this.workspace.value.type === "team" &&
      this.workspace.value.teamID !== undefined
  )

  private documents: Record<string, Doc> = reactive({
    new_team: {
      text: this.t("spotlight.workspace.new"),
      alternates: ["new", "team", "workspace"],
      icon: markRaw(IconUsers),
    },
    edit_team: {
      text: this.t("spotlight.workspace.edit"),
      alternates: ["edit", "team", "workspace"],
      icon: markRaw(IconEdit),
      excludeFromSearch: computed(() => !this.isTeamSelected.value),
    },
    invite_members: {
      text: this.t("spotlight.workspace.invite"),
      alternates: ["invite", "members", "workspace"],
      icon: markRaw(IconUserPlus),
      excludeFromSearch: computed(() => !this.isTeamSelected.value),
    },
    delete_team: {
      text: this.t("spotlight.workspace.delete"),
      alternates: ["delete", "team", "workspace"],
      icon: markRaw(IconTrash2),
      excludeFromSearch: computed(() => !this.isTeamSelected.value),
    },
    switch_to_personal: {
      text: this.t("spotlight.workspace.switch_to_personal"),
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
    if (id === "new_team") invokeAction(`modals.team.new`)
    else if (id === "edit_team") invokeAction(`modals.team.edit`)
    else if (id === "invite_members") invokeAction(`modals.team.invite`)
    else if (id === "delete_team") this.deleteTeam()
    else if (id === "switch_to_personal")
      invokeAction(`workspace.switch.personal`)
  }
}
