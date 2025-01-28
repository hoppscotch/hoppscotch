import { Service } from "dioc"
import { ref } from "vue"
import { getI18n } from "~/modules/i18n"

type HistoryUIProviderTitle = (t: ReturnType<typeof getI18n>) => string

export class HistoryUIProviderService extends Service {
  public static readonly ID = "HISTORY_UI_PROVIDER_SERVICE"

  public readonly isEnabled = ref<boolean>(false)

  public readonly historyUIProviderTitle = ref<HistoryUIProviderTitle>((t) =>
    t("tab.history")
  )
}
