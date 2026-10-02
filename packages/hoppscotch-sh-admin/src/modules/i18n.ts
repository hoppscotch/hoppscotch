import { createI18n } from 'vue-i18n';
import { HoppModule } from '.';
// The dashboard is English-only (locale is fixed below), so bundle just `en`
// instead of every locale in ./locales.
import en from '../../locales/en.json';

const i18n = createI18n({
  locale: 'en',
  messages: { en },
  fallbackLocale: 'en',
  legacy: false,
  allowComposition: true,
});

/**
 * Returns the i18n instance
 */
export function getI18n() {
  return i18n.global.t;
}

export default <HoppModule>{
  onVueAppInit(app) {
    app.use(i18n);
  },
};
