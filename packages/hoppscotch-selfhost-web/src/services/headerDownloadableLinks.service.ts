import { Service } from "dioc"
import { computed, markRaw, Ref, ref } from "vue"
import { installPWA, pwaDefferedPrompt } from "@hoppscotch/common/modules/pwa"
import IconGlobe from "~icons/lucide/globe"
import IconCLI from "~icons/lucide/square-terminal"
import IconApple from "~icons/hopp/apple"
import IconWindows from "~icons/hopp/windows"
import IconLinux from "~icons/hopp/linux"

import {
  AdditionalLinkSet,
  AdditionalLinksService,
  Link,
} from "@hoppscotch/common/services/additionalLinks.service"

const macOS: Link = {
  id: "whats-new",
  text: (t) => t("app.additional_links.macOS"),
  icon: markRaw(IconApple),
  action: {
    type: "link",
    href: "https://hoppscotch.com/download?platform=macOS",
  },
}

const windows: Link = {
  id: "windows",
  text: (t) => t("app.additional_links.windows"),
  icon: markRaw(IconWindows),
  action: {
    type: "link",
    href: "https://hoppscotch.com/download?platform=windows",
  },
}

const linux: Link = {
  id: "linux",
  text: (t) => t("app.additional_links.linux"),
  icon: markRaw(IconLinux),
  action: {
    type: "link",
    href: "https://hoppscotch.com/download?platform=linux",
  },
}

const pwa: Link = {
  id: "pwa",
  text: (t) => t("app.additional_links.web_app"),
  icon: IconGlobe,
  action: {
    type: "custom",
    do: () => {
      installPWA()
    },
  },
  show: computed(() => !!pwaDefferedPrompt.value),
}

const cli: Link = {
  id: "cli",
  text: (t) => t("app.additional_links.cli"),
  icon: IconCLI,
  action: {
    type: "link",
    href: "https://docs.hoppscotch.io/documentation/clients/cli/overview",
  },
}

/**
 * Service to manage the downloadable links in the app header.
 */
export class HeaderDownloadableLinksService
  extends Service
  implements AdditionalLinkSet
{
  public static readonly ID = "HEADER_DOWNLOADABLE_LINKS_SERVICE"
  public readonly linkSetID = "HEADER_DOWNLOADABLE_LINKS"

  private readonly additionalLinkSet = this.bind(AdditionalLinksService)

  /**
   * List of downloadable links to be shown in the header
   * This includes showing the link to the desktop app, PWA, CLI.
   */
  private headerDownloadableLinks = ref<Link[]>([
    macOS,
    windows,
    linux,
    pwa,
    cli,
  ])

  override onServiceInit() {
    this.additionalLinkSet.registerAdditionalSet(this)
  }

  getLinks(): Ref<Link[]> {
    // @ts-expect-error show type not recognizing ComputedRef
    return this.headerDownloadableLinks
  }
}
