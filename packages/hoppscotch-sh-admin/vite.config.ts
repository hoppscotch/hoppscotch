import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { FileSystemIconLoader } from 'unplugin-icons/loaders';
import Icons from 'unplugin-icons/vite';
import Unfonts from "unplugin-fonts/vite";
import IconResolver from 'unplugin-icons/resolver';
import Components from 'unplugin-vue-components/vite';
import WindiCSS from 'vite-plugin-windicss';
import Pages from 'vite-plugin-pages';
import Layouts from 'vite-plugin-vue-layouts';
import VueI18n from '@intlify/vite-plugin-vue-i18n';
import path from 'path';
import ImportMetaEnv from "@import-meta-env/unplugin"

// https://vitejs.dev/config/
export default defineConfig({
  envPrefix:
    process.env.HOPP_ALLOW_RUNTIME_ENV
      ? "VITE_BUILDTIME_"
      : "VITE_",
  server: {
    port: 3100,
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, '../hoppscotch-sh-admin/src'),
      '@modules': path.resolve(__dirname, '../hoppscotch-sh-admin/src/modules'),
    },
  },
  plugins: [
    vue(),
    Pages({
      dirs: './src/pages',
      routeStyle: 'nuxt',
    }),
    Layouts({
      defaultLayout: 'default',
      layoutsDirs: 'src/layouts',
    }),
    VueI18n({
      runtimeOnly: false,
      compositionOnly: true,
      include: [path.resolve(__dirname, 'locales')],
    }),
    WindiCSS({
      root: path.resolve(__dirname),
    }),
    Components({
      dts: './src/components.d.ts',
      dirs: ['./src/components'],
      directoryAsNamespace: true,
      resolvers: [
        IconResolver({
          prefix: 'icon',
          customCollections: ['auth'],
        }),
        (compName: string) => {
          if (compName.startsWith('Hopp'))
            return { name: compName, from: '@hoppscotch/ui' };
          else return undefined;
        },
      ],
      types: [
        {
          from: 'vue-tippy',
          names: ['Tippy'],
        },
      ],
    }),
    Icons({
      compiler: 'vue3',
      customCollections: {
        auth: FileSystemIconLoader('../hoppscotch-sh-admin/assets/icons/auth'),
      },
    }),
    Unfonts({
      fontsource: {
        families: [
          {
            name: "Inter Variable",
            variables: ["variable-full"],
          },
          {
            name: "Material Symbols Rounded Variable",
            variables: ["variable-full"],
          },
          {
            name: "Roboto Mono Variable",
            variables: ["variable-full"],
          },
        ],
      }
    }),
    process.env.HOPP_ALLOW_RUNTIME_ENV
      ?  ImportMetaEnv.vite({
          example: "../../.env.example",
          env: "../../.env",
        })
      : [],
  ],
});
