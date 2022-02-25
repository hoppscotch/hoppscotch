import { defineConfig } from "tsup";

export default defineConfig({
  entry: [ "./src/index.ts" ],
  outDir: "./dist/",
  format: ["esm", "cjs"],
  sourcemap: true,
  clean: true,
});
