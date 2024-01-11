import { Service } from "dioc"
import { computed, ref } from "vue"
import { getI18n } from "~/modules/i18n"

export const BANNER_PRIORITY_LOW = 1
export const BANNER_PRIORITY_MEDIUM = 3
export const BANNER_PRIORITY_HIGH = 5

export type BannerType = "info" | "warning" | "error"

export type BannerContent = {
  type: BannerType
  text: (t: ReturnType<typeof getI18n>) => string
  // Can be used to display an alternate text when display size is small
  alternateText?: (t: ReturnType<typeof getI18n>) => string
  // Used to determine which banner should be displayed when multiple banners are present
  score: number
  dismissible?: boolean
}

export type Banner = {
  id: number
  content: BannerContent
}

// Returns the banner with the highest score
const getBannerWithHighestScore = (list: Banner[]) => {
  if (list.length === 0) return null
  else if (list.length === 1) return list[0]

  const highestScore = Math.max(...list.map((banner) => banner.content.score))
  return list.find((banner) => banner.content.score === highestScore)
}

/**
 * This service is used to display a banner on the app.
 * It can used to display information, warnings or errors.
 */
export class BannerService extends Service {
  public static readonly ID = "BANNER_SERVICE"

  private bannerID = 0
  private bannerList = ref<Banner[]>([])

  public content = computed(() =>
    getBannerWithHighestScore(this.bannerList.value)
  )

  public showBanner(banner: BannerContent) {
    this.bannerID = this.bannerID + 1
    this.bannerList.value.push({ id: this.bannerID, content: banner })
    return this.bannerID
  }

  public removeBanner(id: number) {
    this.bannerList.value = this.bannerList.value.filter(
      (banner) => id !== banner.id
    )
  }
}
