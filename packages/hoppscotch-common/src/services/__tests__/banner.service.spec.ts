import { describe, expect, it } from "vitest"
import { TestContainer } from "dioc/testing"
import { getI18n } from "~/modules/i18n"
import {
  BannerService,
  BANNER_PRIORITY_LOW,
  BANNER_PRIORITY_HIGH,
  BannerContent,
} from "../banner.service"

describe("BannerService", () => {
  const container = new TestContainer()
  const banner = container.bind(BannerService)

  it("should be able to show and remove a banner", () => {
    const bannerContent: BannerContent = {
      type: "info",
      text: (t: ReturnType<typeof getI18n>) => t("Info Banner"),
      score: BANNER_PRIORITY_LOW,
    }

    const bannerId = banner.showBanner(bannerContent)
    expect(banner.content.value).toEqual({
      id: bannerId,
      content: bannerContent,
    })

    banner.removeBanner(bannerId)
    expect(banner.content.value).toBeNull()
  })

  it("should show the banner with the highest score", () => {
    const lowPriorityBanner: BannerContent = {
      type: "info",
      text: (t: ReturnType<typeof getI18n>) => t("Low Priority Banner"),
      score: BANNER_PRIORITY_LOW,
    }

    const highPriorityBanner: BannerContent = {
      type: "warning",
      text: (t: ReturnType<typeof getI18n>) => t("High Priority Banner"),
      score: BANNER_PRIORITY_HIGH,
    }

    banner.showBanner(lowPriorityBanner)
    const highPriorityBannerID = banner.showBanner(highPriorityBanner)

    expect(banner.content.value).toEqual({
      id: highPriorityBannerID,
      content: highPriorityBanner,
    })
  })
})
