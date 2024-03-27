import { I18n, createI18n } from 'vue-i18n';
import { HoppModule } from '.';
import messages from '@intlify/unplugin-vue-i18n/messages';

// A reference to the i18n instance
let i18nInstance: I18n<
  Record<string, unknown>,
  Record<string, unknown>,
  Record<string, unknown>,
  string,
  false
> | null = null;

/**
 * Returns the i18n instance
 */
export function getI18n() {
  return i18nInstance!.global.t;
}

export default <HoppModule>{
  onVueAppInit(app) {
    const i18n = createI18n({
      locale: 'en',
      messages,
      fallbackLocale: 'en',
      legacy: false,
      allowComposition: true,
    });

    app.use(i18n);

    i18nInstance = i18n;
  },
};
