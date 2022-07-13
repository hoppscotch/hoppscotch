import { createI18n, I18nOptions } from "vue-i18n";
import { HoppModule } from "~/types";

import en from "../../locales/en.json"

const i18nModule: HoppModule = ({ app }) => {
  const i18n = createI18n(<I18nOptions>{
    locale: 'en', // TODO: i18n system!
    fallbackLocale: 'en',
    legacy: false,
    allowComposition: true,

    // TODO: Fix this to allow for dynamic imports
    messages: {
      en
    }
  })

  app.use(i18n)
}

export default i18nModule
