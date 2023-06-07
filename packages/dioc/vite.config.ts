import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: './lib/main.ts',
        vue: './lib/vue.ts',
        testing: './lib/testing.ts',
      },
    },
    rollupOptions: {
      external: ['vue'],
    }
  },
})
