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

  constructor() {
    super()

    this.contextMenu.registerMenu(this)
  }

  getMenuFor(text: Readonly<string>): ContextMenuState {
    const results = ref<ContextMenuResult[]>([])
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
            envName: "test",
            variableName: text,
          })
        },
      },
    ]
    const resultObj = <ContextMenuState>{
      results: results.value,
    }
    return resultObj
  }
}
