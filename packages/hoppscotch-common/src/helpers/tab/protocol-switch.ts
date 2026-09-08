import { WorkspaceTabsService } from "~/services/tab/workspace-tabs"
import { GQLTabConnectionService } from "~/services/gql-tab-connection.service"
import { ScrollService } from "~/services/scroll.service"
import { convertRESTToGQL, convertGQLToREST } from "./type-converter"
import { HoppRequestDocument, HoppGQLRequestDocument } from "./document"

/**
 * Shared REST ⇄ GraphQL protocol-switch flow for the active unified-workspace
 * tab — the single source of truth used by both the `ProtocolSwitcher` UI and
 * the AI chat's `switch_protocol` tool. The teardown order here is
 * load-bearing (see the inline comments), so switch through these helpers
 * rather than flipping `tab.document` directly.
 */
export type ProtocolSwitchServices = {
  tabs: WorkspaceTabsService
  gqlTabConn: GQLTabConnectionService
  scrollService: ScrollService
}

/**
 * Switches the active tab's REST request document to GraphQL.
 * @returns whether the switch happened (false when the tab isn't REST).
 */
export function switchActiveTabToGQL({
  tabs,
  scrollService,
}: ProtocolSwitchServices): boolean {
  const tab = tabs.currentActiveTab.value
  if (!tab || tab.document.type !== "request") return false

  // Snapshot the current REST request as the REST draft so a later switch back
  // restores edits the user made before this protocol switch.
  tabs.setProtocolDraft(
    tab.id,
    "rest",
    tab.document.request,
    tab.document.isDirty
  )

  // If the user previously had GQL data on this tab, restore it verbatim.
  // Otherwise let the converter seed a fresh GQL request from the REST one.
  const gqlDraft = tabs.getProtocolDraft(tab.id)?.gql

  // Cancel the in-flight REST run before the document type flips — the runner
  // writes into `tab.document` from a subscription, not a component, so a late
  // response would land a HoppRESTResponse in a field typed GQLResponseEvent[].
  tab.document.cancelFunction?.()

  // The REST document's scroll offsets don't map onto the GQL panes
  scrollService.cleanupScrollForTab(tab.id)

  const gqlDoc = convertRESTToGQL(tab.document as HoppRequestDocument, gqlDraft)
  tab.document = gqlDoc
  tabs.updateTab(tab)
  return true
}

/**
 * Switches the active tab's GraphQL request document to REST.
 * @returns whether the switch happened (false when the tab isn't GraphQL).
 */
export function switchActiveTabToREST({
  tabs,
  gqlTabConn,
  scrollService,
}: ProtocolSwitchServices): boolean {
  const tab = tabs.currentActiveTab.value
  if (!tab || tab.document.type !== "gql-request") return false

  // Snapshot the current GQL request as the GQL draft for round-trip preservation.
  tabs.setProtocolDraft(
    tab.id,
    "gql",
    tab.document.request,
    tab.document.isDirty
  )

  // Restore the previously-snapshotted REST request if any; else seed from GQL.
  const restDraft = tabs.getProtocolDraft(tab.id)?.rest

  const restDoc = convertGQLToREST(
    tab.document as HoppGQLRequestDocument,
    restDraft
  )

  // Tear down the GQL connection (poll timer, subscription socket, context
  // maps) before the document type flips to "request" — the close paths in
  // index.vue skip a tab that is no longer `gql-request`, so the context and
  // its 7s poll loop would leak for the page's lifetime.
  gqlTabConn.cleanupTab(tab.id)
  scrollService.cleanupScrollForTab(tab.id)

  tab.document = restDoc
  tabs.updateTab(tab)
  return true
}
