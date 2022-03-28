import { defineConfig } from "tsup";

export default defineConfig({
  entry: [ "./src/index.ts" ],
  outDir: "./dist/",
  format: ["cjs"],
  platform: "node",
  sourcemap: true,
  bundle: true,
  target: "node12",
  skipNodeModulesBundle: false,
  esbuildOptions(options) {
    options.bundle = true
  },
  noExternal:  [
    /\w+/
  ],
  clean: true,
});
