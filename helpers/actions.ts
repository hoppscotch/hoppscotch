/* An `action` is a unique verb that is associated with certain thing that can be done on Hoppscotch.
 * For example, sending a request.
 */

import { onBeforeUnmount, onMounted } from "@nuxtjs/composition-api"
import { BehaviorSubject } from "rxjs"

export type HoppAction =
  | "request.send-cancel" // Send/Cancel a Hoppscotch Request
  | "request.reset" // Clear request data
  | "request.copy-link" // Copy Request Link
  | "request.save" // Save to Collections
  | "request.save-as" // Save As
  | "request.method.next" // Select Next Method
  | "request.method.prev" // Select Previous Method
  | "request.method.get" // Select GET Method
  | "request.method.head" // Select HEAD Method
  | "request.method.post" // Select POST Method
  | "request.method.put" // Select PUT Method
  | "request.method.delete" // Select DELETE Method
  | "flyouts.keybinds.toggle" // Shows the keybinds flyout
  | "modals.search.toggle" // Shows the search modal
  | "modals.support.toggle" // Shows the support modal
  | "modals.share.toggle" // Shows the share modal
  | "navigation.jump.rest" // Jump to REST page
  | "navigation.jump.graphql" // Jump to GraphQL page
  | "navigation.jump.realtime" // Jump to realtime page
  | "navigation.jump.documentation" // Jump to documentation page
  | "navigation.jump.settings" // Jump to settings page
  | "navigation.jump.back" // Jump to previous page
  | "navigation.jump.forward" // Jump to next page

type BoundActionList = {
  // eslint-disable-next-line no-unused-vars
  [_ in HoppAction]?: Array<() => void>
}

const boundActions: BoundActionList = {}

export const activeActions$ = new BehaviorSubject<HoppAction[]>([])

export function bindAction(action: HoppAction, handler: () => void) {
  if (boundActions[action]) {
    boundActions[action]?.push(handler)
  } else {
    boundActions[action] = [handler]
  }

  activeActions$.next(Object.keys(boundActions) as HoppAction[])
}

export function invokeAction(action: HoppAction) {
  boundActions[action]?.forEach((handler) => handler())
}

export function unbindAction(action: HoppAction, handler: () => void) {
  boundActions[action] = boundActions[action]?.filter((x) => x !== handler)

  if (boundActions[action]?.length === 0) {
    delete boundActions[action]
  }

  activeActions$.next(Object.keys(boundActions) as HoppAction[])
}

export function defineActionHandler(action: HoppAction, handler: () => void) {
  onMounted(() => {
    bindAction(action, handler)
  })

  onBeforeUnmount(() => {
    unbindAction(action, handler)
  })
}
