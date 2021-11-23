import dts from 'rollup-plugin-dts'
import esbuild from 'rollup-plugin-esbuild'
import multi from '@rollup/plugin-multi-entry'

const name = require('./package.json').main.replace(/\.js$/, '')

const bundle = config => ({
  ...config,
  input: 'src/**/*.ts',
  external: id => !/^[./]/.test(id),
})

export default [
  bundle({
    plugins: [multi(), esbuild()],
    output: [
      {
        file: `${name}.js`,
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: `${name}.mjs`,
        format: 'es',
        sourcemap: true,
      },
    ],
  }),
  bundle({
    plugins: [dts()],
    output: {
      file: `${name}.d.ts`,
      format: 'es',
    },
  }),
]
