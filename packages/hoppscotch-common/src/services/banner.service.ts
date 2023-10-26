import { Service } from "dioc"
import { ref } from "vue"

export type BannerType = "info" | "warning" | "error"

export type BannerContent = {
  type: BannerType
  text: string
  // Can be used to display an alternate text when display size is small
  alternateText?: string
}

export class BannerService extends Service {
  public static readonly ID = "BANNER_SERVICE"
  constructor() {
    super()
  }

  public content = ref<BannerContent | undefined>(undefined)
}
