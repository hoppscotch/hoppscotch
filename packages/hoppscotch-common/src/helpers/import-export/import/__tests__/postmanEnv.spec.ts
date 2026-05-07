import * as E from "fp-ts/Either"
import { describe, expect, it } from "vitest"

import { postmanEnvImporter } from "../postmanEnv"

const runImport = async (envs: object[]) => {
  const result = await postmanEnvImporter([JSON.stringify(envs)])()
  if (E.isLeft(result)) throw new Error(`importer failed: ${result.left}`)
  return result.right
}

describe("postmanEnvImporter — secret flag handling", () => {
  it('recognizes the legacy `type: "secret"` shape (older Postman exports)', async () => {
    const [env] = await runImport([
      {
        name: "Legacy",
        values: [
          {
            key: "API_KEY",
            value: "old-secret-value",
            type: "secret",
            enabled: true,
          },
          {
            key: "URL",
            value: "https://example.com",
            type: "default",
            enabled: true,
          },
        ],
      },
    ])

    expect(env.variables).toEqual([
      expect.objectContaining({ key: "API_KEY", secret: true }),
      expect.objectContaining({ key: "URL", secret: false }),
    ])
  })

  it('recognizes the Postman 12+ `secret: true` boolean (with `type: "default"`)', async () => {
    const [env] = await runImport([
      {
        name: "PET_STORE",
        values: [
          {
            key: "baseUrl-secret",
            value: "",
            type: "default",
            enabled: true,
            secret: true,
          },
          {
            key: "baseUrl-not-secret",
            value: "baseUrl-not-secret",
            type: "default",
            enabled: true,
          },
        ],
      },
    ])

    expect(env.variables).toEqual([
      expect.objectContaining({ key: "baseUrl-secret", secret: true }),
      expect.objectContaining({ key: "baseUrl-not-secret", secret: false }),
    ])
  })

  it("treats a variable as secret when EITHER signal is present", async () => {
    const [env] = await runImport([
      {
        name: "Mixed",
        values: [
          // Both signals — still secret
          {
            key: "BOTH",
            value: "x",
            type: "secret",
            secret: true,
            enabled: true,
          },
          // Only legacy
          { key: "LEGACY", value: "x", type: "secret", enabled: true },
          // Only new
          {
            key: "NEW",
            value: "x",
            type: "default",
            secret: true,
            enabled: true,
          },
          // Neither — not secret
          { key: "PLAIN", value: "x", type: "default", enabled: true },
        ],
      },
    ])

    expect(env.variables.map((v) => [v.key, v.secret])).toEqual([
      ["BOTH", true],
      ["LEGACY", true],
      ["NEW", true],
      ["PLAIN", false],
    ])
  })
})
