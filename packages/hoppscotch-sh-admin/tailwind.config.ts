import { Config } from 'tailwindcss';
import preset from '@hoppscotch/ui/ui-preset';

export default {
  content: ['src/**/*.{vue,html}', '../hoppscotch-ui/src/**/*.{vue,html}'],
  presets: [preset],
} satisfies Config;
