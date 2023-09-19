/* An `action` is a unique verb that is associated with certain thing that can be done on Hoppscotch.
 * For example, sending a request.
 */

import { Ref, onBeforeUnmount, onMounted, reactive, watch } from "vue"
import { BehaviorSubject } from "rxjs"
import { HoppRESTDocument } from "./rest/document"
import { HoppGQLRequest, HoppRESTRequest } from "@hoppscotch/data"
import { RequestOptionTabs } from "~/components/http/RequestOptions.vue"
import { HoppGQLSaveContext } from "./graphql/document"
import { GQLOptionTabs } from "~/components/graphql/RequestOptions.vue"
import { computed } from "vue"

export type HoppAction =
  | "contextmenu.open" // Send/Cancel a Hoppscotch Request
  | "request.send-cancel" // Send/Cancel a Hoppscotch Request
  | "request.reset" // Clear request data
  | "request.copy-link" // Copy Request Link
  | "request.save" // Save to Collections
  | "request.save-as" // Save As
  | "request.rename" // Rename request on REST or GraphQL
  | "request.method.next" // Select Next Method
  | "request.method.prev" // Select Previous Method
  | "request.method.get" // Select GET Method
  | "request.method.head" // Select HEAD Method
  | "request.method.post" // Select POST Method
  | "request.method.put" // Select PUT Method
  | "request.method.delete" // Select DELETE Method
  | "request.import-curl" // Import cURL
  | "request.show-code" // Show generated code
  | "gql.connect" // Connect to GraphQL endpoint given
  | "gql.disconnect" // Disconnect from GraphQL endpoint given
  | "tab.close-current" // Close current tab
  | "tab.close-other" // Close other tabs
  | "tab.open-new" // Open new tab
  | "collection.new" // Create root collection
  | "flyouts.chat.open" // Shows the keybinds flyout
  | "flyouts.keybinds.toggle" // Shows the keybinds flyout
  | "modals.search.toggle" // Shows the search modal
  | "modals.support.toggle" // Shows the support modal
  | "modals.share.toggle" // Shows the share modal
  | "modals.environment.add" // Show add environment modal via context menu
  | "modals.environment.new" // Add new environment
  | "modals.environment.delete-selected" // Delete Selected Environment
  | "modals.my.environment.edit" // Edit current personal environment
  | "modals.team.environment.edit" // Edit current team environment
  | "modals.team.new" // Add new team
  | "modals.team.edit" // Edit selected team
  | "modals.team.invite" // Invite selected team
  | "workspace.switch.personal" // Switch to personal workspace
  | "navigation.jump.rest" // Jump to REST page
  | "navigation.jump.graphql" // Jump to GraphQL page
  | "navigation.jump.realtime" // Jump to realtime page
  | "navigation.jump.documentation" // Jump to documentation page
  | "navigation.jump.settings" // Jump to settings page
  | "navigation.jump.profile" // Jump to profile page
  | "settings.theme.system" // Use system theme
  | "settings.theme.light" // Use light theme
  | "settings.theme.dark" // Use dark theme
  | "settings.theme.black" // Use black theme
  | "response.preview.toggle" // Toggle response preview
  | "response.file.download" // Download response as file
  | "response.copy" // Copy response to clipboard
  | "modals.login.toggle" // Login to Hoppscotch
  | "history.clear" // Clear REST History
  | "user.login" // Login to Hoppscotch
  | "user.logout" // Log out of Hoppscotch
  | "editor.format" // Format editor content

/**
 * Defines the arguments, if present for a given type that is required to be passed on
 * invocation and will be passed to action handlers.
 *
 * This type is supposed to be an object with the key being one of the actions mentioned above.
 * The value to the key can be anything.
 * If an action has no argument, you do not need to add it to this type.
 *
 * NOTE: We can't enforce type checks to make sure the key is Action, you
 * will know if you got something wrong if there is a type error in this file
 */
type HoppActionArgsMap = {
  "contextmenu.open": {
    position: {
      top: number
      left: number
    }
    text: string | null
  }
  "modals.my.environment.edit": {
    envName: string
    variableName?: string
  }
  "modals.team.environment.edit": {
    envName: string
    variableName?: string
  }
  "modals.team.delete": {
    teamId: string
  }
  "workspace.switch": {
    teamId: string
  }
  "rest.request.open": {
    doc: HoppRESTDocument
  }
  "request.save-as":
    | {
        requestType: "rest"
        request: HoppRESTRequest
      }
    | {
        requestType: "gql"
        request: HoppGQLRequest
      }
  "request.open-tab": {
    tab: RequestOptionTabs | GQLOptionTabs
  }

  "tab.duplicate-tab": {
    tabID?: string
  }

  "gql.request.open": {
    request: HoppGQLRequest
    saveContext?: HoppGQLSaveContext
  }
  "modals.environment.add": {
    envName: string
    variableName: string
  }
}

/**
 * HoppActions which require arguments for their invocation
 */
export type HoppActionWithArgs = keyof HoppActionArgsMap

/**
 * HoppActions which do not require arguments for their invocation
 */
export type HoppActionWithNoArgs = Exclude<HoppAction, HoppActionWithArgs>

/**
 * Resolves the argument type for a given HoppAction
 */
type ArgOfHoppAction<A extends HoppAction | HoppActionWithArgs> =
  A extends HoppActionWithArgs ? HoppActionArgsMap[A] : undefined

/**
 * Resolves the action function for a given HoppAction, used by action handler function defs
 */
type ActionFunc<A extends HoppAction | HoppActionWithArgs> =
  A extends HoppActionWithArgs ? (arg: ArgOfHoppAction<A>) => void : () => void

type BoundActionList = {
  // eslint-disable-next-line no-unused-vars
  [A in HoppAction | HoppActionWithArgs]?: Array<ActionFunc<A>>
}

const boundActions: BoundActionList = reactive({})

export const activeActions$ = new BehaviorSubject<
  (HoppAction | HoppActionWithArgs)[]
>([])

export function bindAction<A extends HoppAction | HoppActionWithArgs>(
  action: A,
  handler: ActionFunc<A>
) {
  if (boundActions[action]) {
    boundActions[action]?.push(handler)
  } else {
    // 'any' assertion because TypeScript doesn't seem to be able to figure out the links.
    boundActions[action] = [handler] as any
  }

  activeActions$.next(Object.keys(boundActions) as HoppAction[])
}

type InvokeActionFunc = {
  (action: HoppActionWithNoArgs, args?: undefined): void
  <A extends HoppActionWithArgs>(action: A, args: HoppActionArgsMap[A]): void
}

/**
 * Invokes a action, triggering action handlers if any registered.
 * The second argument parameter is optional if your action has no args required
 * @param action The action to fire
 * @param args The argument passed to the action handler. Optional if action has no args required
 */
export const invokeAction: InvokeActionFunc = <
  A extends HoppAction | HoppActionWithArgs,
>(
  action: A,
  args: ArgOfHoppAction<A>
) => {
  boundActions[action]?.forEach((handler) => handler(args! as any))
}

export function unbindAction<A extends HoppAction | HoppActionWithArgs>(
  action: A,
  handler: ActionFunc<A>
) {
  // 'any' assertion because TypeScript doesn't seem to be able to figure out the links.
  boundActions[action] = boundActions[action]?.filter(
    (x) => x !== handler
  ) as any

  if (boundActions[action]?.length === 0) {
    delete boundActions[action]
  }

  activeActions$.next(Object.keys(boundActions) as HoppAction[])
}

/**
 * Returns a ref that indicates whether a given action is bound at a given time
 *
 * @param action The action to check
 */
export function isActionBound(action: HoppAction): Ref<boolean> {
  return computed(() => !!boundActions[action])
}

/**
 * A composable function that defines a component can handle a given
 * HoppAction. The handler will be bound when the component is mounted
 * and unbound when the component is unmounted.
 * @param action The action to be bound
 * @param handler The function to be called when the action is invoked
 * @param isActive A ref that indicates whether the action is active
 */
export function defineActionHandler<A extends HoppAction | HoppActionWithArgs>(
  action: A,
  handler: ActionFunc<A>,
  isActive: Ref<boolean> | undefined = undefined
) {
  let mounted = false
  let bound = false

  onMounted(() => {
    mounted = true

    // Only bind if isActive is undefined or true
    if (isActive === undefined || isActive.value === true) {
      bound = true
      bindAction(action, handler)
    }
  })

  onBeforeUnmount(() => {
    mounted = false
    bound = false

    unbindAction(action, handler)
  })

  if (isActive) {
    watch(
      isActive,
      (active) => {
        if (mounted) {
          if (active) {
            if (!bound) {
              bound = true
              bindAction(action, handler)
            }
          } else if (bound) {
            bound = false

            unbindAction(action, handler)
          }
        }
      },
      { immediate: true }
    )
  }
}
