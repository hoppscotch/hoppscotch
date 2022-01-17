import { Options } from "tsup"

const options: Options = {
  format: [
    "cjs",
    // loading Babel in ESM is tricky, since Babel itself it CJS only
    // we decided to drop ESM support until Babel supports native ESM
    // 'esm',
  ],
  clean: true,
  splitting: true,
  dts: true,
  entryPoints: ["src/**/*.ts"],
}

export default options
