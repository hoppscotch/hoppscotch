import { Service } from "dioc"
import { ref } from "vue"

/**
 * The different types of banners that can be used.
 */
export type BannerType = "info" | "warning" | "error"

export type BannerContent = {
  type: BannerType
  text: string
  // Can be used to display an alternate text when display size is small
  alternateText?: string
}

/**
 * This service is used to display a banner on the app.
 * It can used to display information, warnings or errors.
 */
export class BannerService extends Service {
  public static readonly ID = "BANNER_SERVICE"

  /**
   * This is a reactive variable that can be used to set the contents of the banner
   * and use it to render the banner on components.
   */
  public content = ref<BannerContent | null>(null)
}
