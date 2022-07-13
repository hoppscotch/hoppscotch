import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'
import VueI18n from "@intlify/unplugin-vue-i18n/vite"
import Components from "unplugin-vue-components/vite"
import Icons from "unplugin-icons/vite"
import WindiCSS from "vite-plugin-windicss"
import { VitePWA } from "vite-plugin-pwa"
import NodePolyfills from "rollup-plugin-polyfill-node"
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill';
import Pages from "vite-plugin-pages"
import Layouts from "vite-plugin-vue-layouts"
import IconResolver from "unplugin-icons/resolver"
import { FileSystemIconLoader } from "unplugin-icons/loaders"
import * as path from 'path'

export const APP_INFO = {
  name: "Hoppscotch",
  shortDescription: "Open source API development ecosystem",
  description:
    "Helps you create requests faster, saving precious time on development.",
  keywords:
    "hoppscotch, hopp scotch, hoppscotch online, hoppscotch app, postwoman, postwoman chrome, postwoman online, postwoman for mac, postwoman app, postwoman for windows, postwoman google chrome, postwoman chrome app, get postwoman, postwoman web, postwoman android, postwoman app for chrome, postwoman mobile app, postwoman web app, api, request, testing, tool, rest, websocket, sse, graphql, socketio",
  loading: {
    color: "var(--divider-dark-color)",
    background: "var(--primary-color)",
    accent: "var(--accent-color)",
  },
  app: {
    background: "#202124",
  },
  social: {
    twitter: "@hoppscotch_io",
  },
} as const

export default defineConfig({
  // TODO: Migrate @hoppscotch/data to full ESM
  define: {
    // For 'util' polyfill required by dep of '@apidevtools/swagger-parser'
    "process.env": {}
  },
  optimizeDeps: {
    include: [
      '@hoppscotch/data'
    ],

    esbuildOptions: {
      // Node.js global to browser globalThis
            define: {
              global: 'globalThis'
            },
      // Enable esbuild polyfill plugins
            plugins: [
              NodeGlobalsPolyfillPlugin({
                process: true,
                buffer: true
              }),
              NodeModulesPolyfillPlugin()
            ]
          }
  },
  build: {
    commonjsOptions: {
      include: [ "@hoppscotch/data" ]
    },
    rollupOptions: {
      plugins: [
        NodePolyfills()
      ]
    }
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './src'),
      '@composables': path.resolve(__dirname, './src/composables'),
      '@modules': path.resolve(__dirname, './src/modules'),
      '@components': path.resolve(__dirname, './src/components'),
      '@helpers': path.resolve(__dirname, './src/helpers'),
      '@functional': path.resolve(__dirname, './src/helpers/functional'),
      '@workers': path.resolve(__dirname, "./src/workers"),

      // Excerpt from: https://gist.github.com/sujit-baniya/759104dbbd9fa76d20a042108bad0f78
      // This Rollup aliases are extracted from @esbuild-plugins/node-modules-polyfill,
      // see https://github.com/remorses/esbuild-plugins/blob/master/node-modules-polyfill/src/polyfills.ts
      // process and buffer are excluded because already managed
      // by node-globals-polyfill
			util: 'rollup-plugin-node-polyfills/polyfills/util',
			sys: 'util',
			events: 'rollup-plugin-node-polyfills/polyfills/events',
			stream: 'stream-browserify',
			path: 'rollup-plugin-node-polyfills/polyfills/path',
			querystring: 'rollup-plugin-node-polyfills/polyfills/qs',
			punycode: 'rollup-plugin-node-polyfills/polyfills/punycode',
			url: 'rollup-plugin-node-polyfills/polyfills/url',
			http: 'rollup-plugin-node-polyfills/polyfills/http',
			https: 'rollup-plugin-node-polyfills/polyfills/http',
			os: 'rollup-plugin-node-polyfills/polyfills/os',
			assert: 'rollup-plugin-node-polyfills/polyfills/assert',
			constants: 'rollup-plugin-node-polyfills/polyfills/constants',
			_stream_duplex:
				'rollup-plugin-node-polyfills/polyfills/readable-stream/duplex',
			_stream_passthrough:
				'rollup-plugin-node-polyfills/polyfills/readable-stream/passthrough',
			_stream_readable:
				'rollup-plugin-node-polyfills/polyfills/readable-stream/readable',
			_stream_writable:
				'rollup-plugin-node-polyfills/polyfills/readable-stream/writable',
			_stream_transform:
				'rollup-plugin-node-polyfills/polyfills/readable-stream/transform',
			timers: 'rollup-plugin-node-polyfills/polyfills/timers',
			console: 'rollup-plugin-node-polyfills/polyfills/console',
			vm: 'rollup-plugin-node-polyfills/polyfills/vm',
			zlib: 'rollup-plugin-node-polyfills/polyfills/zlib',
			tty: 'rollup-plugin-node-polyfills/polyfills/tty',
			domain: 'rollup-plugin-node-polyfills/polyfills/domain'
     }
  },
  plugins: [
    Vue(),
    Pages({
      routeStyle: "nuxt",
      dirs: "src/pages",
    }),
    Layouts({
      layoutsDirs: "./src/layouts",
      defaultLayout: "default"
    }),
    VueI18n({
      include: path.resolve(__dirname, "./locales")
    }),
    WindiCSS(),
    Components({
      dts: true,
      directoryAsNamespace: true,
      resolvers: [
        IconResolver({
          prefix: "icon",
          customCollections: [
            "hopp",
            "auth",
            "brands"
          ]
        })
      ],
    }),
    Icons({
      customCollections: {
        'hopp': FileSystemIconLoader("./assets/icons"),
        'auth': FileSystemIconLoader("./assets/icons/auth"),
        'brands': FileSystemIconLoader("./assets/icons/brands")
      }
    }),
    VitePWA({
      manifest: {
        name: APP_INFO.name,
        short_name: APP_INFO.name,
        description: APP_INFO.shortDescription,
        start_url: "?source=pwa",
        background_color: APP_INFO.app.background
      },
      registerType: "prompt",
      workbox: {
        cleanupOutdatedCaches: true,
      }
    })
  ]
})
