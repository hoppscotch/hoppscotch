import { Service } from "dioc"
import {
  ContextMenu,
  ContextMenuResult,
  ContextMenuService,
  ContextMenuState,
} from "../"
import { markRaw, ref } from "vue"
import { invokeAction } from "~/helpers/actions"
import IconPlusCircle from "~icons/lucide/plus-circle"
import { getI18n } from "~/modules/i18n"
import { RESTTabService } from "~/services/tab/rest"
import { TeamCollectionsService } from "~/services/team-collection.service"
import { TeamCollection } from "~/helpers/teams/TeamCollection"
import { getRESTCollection } from "~/newstore/collections"

/**
 * This menu returns a single result that allows the user
 * to add the selected text as an environment variable
 * This menus is shown on all text selections
 */
export class EnvironmentMenuService extends Service implements ContextMenu {
  public static readonly ID = "ENVIRONMENT_CONTEXT_MENU_SERVICE"

  private t = getI18n()

  public readonly menuID = "environment"

  private readonly contextMenu = this.bind(ContextMenuService)
  private readonly restTabs = this.bind(RESTTabService)
  private readonly teamCollectionService = this.bind(TeamCollectionsService)

  override onServiceInit() {
    this.contextMenu.registerMenu(this)
  }

  getMenuFor(text: Readonly<string>): ContextMenuState {
    const results = ref<ContextMenuResult[]>([])

    const currentTab = this.restTabs.currentActiveTab.value
    const saveContext =
      currentTab?.document.type === "request"
        ? currentTab.document.saveContext
        : null

    const findTeamCollectionByID = (
      collections: TeamCollection[],
      collectionID: string
    ): TeamCollection | null => {
      for (const collection of collections) {
        if (collection.id === collectionID) return collection

        const nestedCollection = collection.children
          ? findTeamCollectionByID(collection.children, collectionID)
          : null

        if (nestedCollection) return nestedCollection
      }

      return null
    }

    results.value = [
      {
        id: "environment",
        text: {
          type: "text",
          text: this.t("context_menu.set_environment_variable"),
        },
        icon: markRaw(IconPlusCircle),
        action: () => {
          invokeAction("modals.environment.add", {
            envName: "",
            variableName: text,
          })
        },
      },
    ]

    if (saveContext?.originLocation === "user-collection") {
      const rootCollectionIndex = Number.parseInt(
        saveContext.folderPath.split("/")[0] ?? "",
        10
      )

      if (
        !Number.isNaN(rootCollectionIndex) &&
        saveContext.requestIndex !== undefined
      ) {
        const targetCollection = getRESTCollection(rootCollectionIndex)
        const collectionRefID = targetCollection?._ref_id

        if (collectionRefID) {
          results.value.push({
            id: "collection",
            text: {
              type: "text",
              text: this.t("context_menu.set_collection_variable"),
            },
            icon: markRaw(IconPlusCircle),
            action: () => {
              invokeAction("modals.environment.add", {
                envName: "",
                variableName: text,
                scope: "collection",
                collection: {
                  originLocation: "user-collection",
                  collectionRefID,
                  collectionPath: `${rootCollectionIndex}`,
                  collectionName: targetCollection.name,
                },
              })
            },
          })
        }
      }
    } else if (
      saveContext?.originLocation === "team-collection" &&
      saveContext.collectionID
    ) {
      const collection = findTeamCollectionByID(
        this.teamCollectionService.collections.value,
        saveContext.collectionID
      )

      if (collection) {
        results.value.push({
          id: "collection",
          text: {
            type: "text",
            text: this.t("context_menu.set_collection_variable"),
          },
          icon: markRaw(IconPlusCircle),
          action: () => {
            invokeAction("modals.environment.add", {
              envName: "",
              variableName: text,
              scope: "collection",
              collection: {
                originLocation: "team-collection",
                collectionID: collection.id,
                collectionName: collection.title,
              },
            })
          },
        })
      }
    }

    const resultObj = <ContextMenuState>{
      results: results.value,
    }
    return resultObj
  }
}
