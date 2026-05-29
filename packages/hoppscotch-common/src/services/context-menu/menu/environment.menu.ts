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
import {
  navigateToFolderWithIndexPath,
  restCollectionStore,
} from "~/newstore/collections"
import { findTeamCollectionByID } from "~/helpers/utils/teamCollection"

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
      currentTab &&
      (currentTab.document.type === "request" ||
        currentTab.document.type === "example-response")
        ? currentTab.document.saveContext
        : null

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
      const folderPath = saveContext.folderPath
      const targetCollection = navigateToFolderWithIndexPath(
        restCollectionStore.value.state,
        folderPath.split("/").map((x) => parseInt(x))
      )

      if (targetCollection && saveContext.requestIndex !== undefined) {
        const collectionRefID = targetCollection._ref_id

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
                  collectionPath: folderPath,
                  collectionName: targetCollection.name ?? "",
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
      const leafCollectionID =
        saveContext.collectionID.split("/").pop() ?? saveContext.collectionID

      const collection = findTeamCollectionByID(
        this.teamCollectionService.collections.value,
        leafCollectionID
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
                collectionName: collection.title ?? "",
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
