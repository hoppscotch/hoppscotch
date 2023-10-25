import { Service } from "dioc"
import { ref } from "vue"
import { getI18n } from "~/modules/i18n"

export type BannerType = "info" | "warning" | "error"

export type BannerContent = {
  type: BannerType
  text: (t: ReturnType<typeof getI18n>) => string
  // Can be used to display an alternate text when display size is small
  alternateText?: (t: ReturnType<typeof getI18n>) => string
}

export class BannerService extends Service {
  public static readonly ID = "BANNER_SERVICE"
  constructor() {
    super()
  }

  public content = ref<BannerContent>()
}
