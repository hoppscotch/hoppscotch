import {defineConfig} from '@eloqnt/cli';

import languages from '../languages.json';

// `cn` and `tw` are region subtags rather than languages, so the files they name
// are mapped to the locales they actually hold instead of being renamed.
const codes = {'zh-CN': 'cn', 'zh-TW': 'tw'};

const localesByCode = Object.fromEntries(
  Object.entries(codes).map(([locale, code]) => [code, locale])
);

export default defineConfig({
  messages: {
    path: './locales/{code}',
    locales: languages.map(({code}) => localesByCode[code] ?? code),
    sourceLocale: 'en',
    format: {codec: '@eloqnt/format-vue-i18n-json', extension: '.json'},
    codes
  }
});
