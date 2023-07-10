import { Service } from "dioc"
import {
  ContextMenu,
  ContextMenuResult,
  ContextMenuService,
  ContextMenuState,
} from "../"
import { markRaw, ref } from "vue"
import { invokeAction } from "~/helpers/actions"
import IconPlus from "~icons/lucide/plus"

export class EnvironmentMenuService extends Service implements ContextMenu {
  public static readonly ID = "ENVIRONMENT_CONTEXT_MENU_SERVICE"

  public readonly menuID = "environment"

  private readonly contextMenu = this.bind(ContextMenuService)

  constructor() {
    super()

    this.contextMenu.registerMenu(this)
  }

  createMenuType(text: Readonly<string>): ContextMenuState {
    const results = ref<ContextMenuResult[]>([])

    results.value = [
      {
        id: "environment",
        text: {
          type: "text",
          text: "Add to environment",
        },
        icon: markRaw(IconPlus),
        action: () => {
          invokeAction("modals.my.environment.add", {
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
