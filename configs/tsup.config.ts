import { defineConfig } from "tsup";

const defaultConfig = defineConfig({
  entry: ["./src/index.ts"],
  target: "esnext",
  dts: true,
  platform: "browser",
  format: "esm",
  treeshake: {
    preset: "safest"
  }
});

export default defaultConfig;

export const doubleEntryConfig = defineConfig({
  ...defaultConfig,
  entryPoints: ["src/index.ts", "src/server.ts"]
});
