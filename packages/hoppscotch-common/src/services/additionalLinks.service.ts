import { Service } from "dioc"
import { Component, ComputedRef, Ref } from "vue"
import { getI18n } from "~/modules/i18n"

export type Link = {
  id: string
  text: (t: ReturnType<typeof getI18n>) => string
  icon: Component
  action: { type: "link"; href: string } | { type: "custom"; do: () => void }
  show?: ComputedRef<boolean>
}

// The possible links IDs
type LinkID = "HEADER_DOWNLOADABLE_LINKS" | string

export interface AdditionalLinkSet {
  linkSetID: LinkID
  getLinks: () => Ref<Link[]>
}

/**
 * Service to manage additional links in the app
 * This service is used to register and retrieve link sets
 * that can be displayed in the app's UI.
 * Each link set can contain multiple links, each with its own action.
 * The links can be displayed in different parts of the app, such as the header or footer.
 */
export class AdditionalLinksService extends Service {
  public static readonly ID = "ADDITIONAL_LINKS_SERVICE"

  private additionalLinkSets: Map<string, AdditionalLinkSet> = new Map()

  /**
   * Registers a link set with the LinksService
   * @param linkSet The link set to register
   */
  public registerAdditionalSet(linkSet: AdditionalLinkSet) {
    this.additionalLinkSets.set(linkSet.linkSetID, linkSet)
  }

  /**
   * Gets all registered link sets
   */
  public getAllLinkSets(): IterableIterator<[string, AdditionalLinkSet]> {
    return this.additionalLinkSets.entries()
  }

  /**
   * Gets a link set by its ID
   * @param linkSetID The ID of the link set to get
   */
  public getLinkSet(linkSetID: LinkID): AdditionalLinkSet | undefined {
    return this.additionalLinkSets.get(linkSetID)
  }
}
