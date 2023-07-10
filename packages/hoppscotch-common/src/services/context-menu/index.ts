import { Service } from "dioc"
import { Component } from "vue"

export type ContextMenuTextType<T extends object | Component = never> =
  | {
      type: "text"
      text: string[] | string
    }
  | {
      type: "custom"
      component: T
      componentProps: T extends Component<infer Props> ? Props : never
    }

export interface ContextMenuResult {
  id: string
  text: ContextMenuTextType<any>
  icon: object | Component
  action: () => void
  meta?: {
    keyboardShortcut?: string[]
  }
}

export type ContextMenuState = {
  results: ContextMenuResult[]
}

export interface ContextMenu {
  menuID: string
  createMenuType: (text: string) => ContextMenuState
}

export class ContextMenuService extends Service {
  private static readonly ID = "CONTEXT_MENU_SERVICE"

  private menus: Map<string, ContextMenu> = new Map()

  public registerMenu(menu: ContextMenu) {
    this.menus.set(menu.menuID, menu)
  }

  public createMenuType(text: string): ContextMenuResult[] {
    const menuSessions = Array.from(this.menus.values()).map((x) =>
      x.createMenuType(text)
    )

    const result = menuSessions.flatMap((x) => x.results)

    return result
  }
}
