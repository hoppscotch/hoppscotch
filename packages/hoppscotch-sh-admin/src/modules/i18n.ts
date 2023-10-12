import { createI18n } from 'vue-i18n';
import { HoppModule } from '.';
import messages from '@intlify/unplugin-vue-i18n/messages';

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
  },
};
