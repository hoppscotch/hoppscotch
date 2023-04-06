import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { FileSystemIconLoader } from 'unplugin-icons/loaders';
import Icons from 'unplugin-icons/vite';
import IconResolver from 'unplugin-icons/resolver';
import Components from 'unplugin-vue-components/vite';
import WindiCSS from 'vite-plugin-windicss';
import Pages from 'vite-plugin-pages';
import Layouts from 'vite-plugin-vue-layouts';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  envDir: path.resolve(__dirname, '../../'),
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
  ],
});
