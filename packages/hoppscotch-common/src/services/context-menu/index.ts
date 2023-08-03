import { Service } from "dioc"
import { Component } from "vue"

/**
 * Defines how to render the text in a Context Menu Search Result
 */
export type ContextMenuTextType<T extends object | Component = never> =
  | {
      type: "text"
      text: string
    }
  | {
      type: "custom"
      /**
       * The component to render in place of the text
       */
      component: T

      /**
       * The props to pass to the component
       */
      componentProps: T extends Component<infer Props> ? Props : never
    }

/**
 * Defines info about a context menu result so the UI can render it
 */
export interface ContextMenuResult {
  /**
   * The unique ID of the result
   */
  id: string
  /**
   * The text to render in the result
   */
  text: ContextMenuTextType<any>
  /**
   * The icon to render as the signifier of the result
   */
  icon: object | Component
  /**
   * The action to perform when the result is selected
   */
  action: () => void
  /**
   * Additional metadata about the result
   */
  meta?: {
    /**
     * The keyboard shortcut to trigger the result
     */
    keyboardShortcut?: string[]
  }
}

/**
 * Defines the state of a context menu
 */
export type ContextMenuState = {
  results: ContextMenuResult[]
}

/**
 * Defines a context menu
 */
export interface ContextMenu {
  /**
   * The unique ID of the context menu
   * This is used to identify the context menu
   */
  menuID: string
  /**
   * Gets the context menu for the given text
   * @param text The text to get the context menu for
   * @returns The context menu state
   */
  getMenuFor: (text: string) => ContextMenuState
}

/**
 * Defines the context menu service
 * This service is used to register context menus and get context menus for text
 * This service is used by the context menu UI
 */
export class ContextMenuService extends Service {
  public static readonly ID = "CONTEXT_MENU_SERVICE"

  private menus: Map<string, ContextMenu> = new Map()

  /**
   * Registers a menu with the context menu service
   * @param menu The menu to register
   */
  public registerMenu(menu: ContextMenu) {
    this.menus.set(menu.menuID, menu)
  }

  /**
   * Gets the context menu for the given text
   * @param text The text to get the context menu for
   */
  public getMenuFor(text: string): ContextMenuResult[] {
    const menus = Array.from(this.menus.values()).map((x) => x.getMenuFor(text))

    const result = menus.flatMap((x) => x.results)

    return result
  }
}
