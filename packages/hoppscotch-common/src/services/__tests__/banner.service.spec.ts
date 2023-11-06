import { describe, expect, it } from "vitest"
import { BannerContent, BannerService } from "../banner.service"
import { TestContainer } from "dioc/testing"

describe("BannerService", () => {
  const container = new TestContainer()
  const service = container.bind(BannerService)

  it("initally there are no banners defined", () => {
    expect(service.content.value).toEqual(null)
  })

  it("should be able to set and retrieve banner content", () => {
    const sampleBanner: BannerContent = {
      type: "info",
      text: "Info Banner",
    }

    const banner = service.content
    banner.value = sampleBanner
    const retrievedBanner = service.content.value

    expect(retrievedBanner).toEqual(sampleBanner)
  })

  it("should be able to update the banner content", () => {
    const updatedBanner: BannerContent = {
      type: "warning",
      text: "Updated Banner Content",
      alternateText: "Updated Banner",
    }

    service.content.value = updatedBanner
    const retrievedBanner = service.content.value

    expect(retrievedBanner).toEqual(updatedBanner)
  })
})
