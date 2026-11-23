import { firstValueFrom } from "rxjs"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

vi.mock("~/modules/i18n", () => ({ getI18n: () => (k: string) => k }))

import { getService } from "~/modules/dioc"
import { CurrentValueService } from "~/services/current-environment-value.service"
import { SecretEnvironmentService } from "~/services/secret-environment.service"
import {
  aggregateEnvsWithCurrentValue$,
  clearGlobalEnvVariables,
  createEnvironment,
  getAggregateEnvsWithCurrentValue,
  replaceEnvironments,
  setGlobalEnvVariables,
  setSelectedEnvironmentIndex,
} from "../environments"

const variable = (key: string, secret = false) => ({
  key,
  initialValue: secret ? "" : `${key}-initial`,
  currentValue: secret ? "" : `${key}-stored`,
  secret,
})

const withoutPredefined = <T extends { key: string }>(envs: T[]) =>
  envs.filter(({ key }) => !key.startsWith("$"))

describe("aggregate environment variables", () => {
  beforeEach(() => {
    replaceEnvironments([])
    createEnvironment(
      "env",
      [
        variable("plain"),
        variable("secret", true),
        variable("emptied"),
        variable("noLocalValue"),
        variable("noSecretValue", true),
      ],
      "env-id"
    )
    setSelectedEnvironmentIndex({ type: "MY_ENV", index: 0 })

    // `varIndex` is the position in the environment, so each list has gaps
    getService(CurrentValueService).addEnvironment("env-id", [
      { key: "plain", currentValue: "first", varIndex: 0, isSecret: false },
      { key: "plain", currentValue: "second", varIndex: 0, isSecret: false },
      { key: "emptied", currentValue: "", varIndex: 2, isSecret: false },
    ])
    getService(SecretEnvironmentService).addSecretEnvironment("env-id", [
      {
        key: "secret",
        value: "secret-current",
        initialValue: "secret-initial",
        varIndex: 1,
      },
    ])

    setGlobalEnvVariables({
      v: 2,
      variables: [variable("globalPlain"), variable("globalSecret", true)],
    })
    getService(CurrentValueService).addEnvironment("Global", [
      {
        key: "globalPlain",
        currentValue: "global-current",
        varIndex: 0,
        isSecret: false,
      },
    ])
    getService(SecretEnvironmentService).addSecretEnvironment("Global", [
      {
        key: "globalSecret",
        value: "global-secret-current",
        initialValue: "global-secret-initial",
        varIndex: 1,
      },
    ])
  })

  afterEach(() => {
    setSelectedEnvironmentIndex({ type: "NO_ENV_SELECTED" })
    clearGlobalEnvVariables()
    getService(CurrentValueService).environments.clear()
    getService(SecretEnvironmentService).secretEnvironments.clear()
  })

  const expected = [
    {
      key: "plain",
      currentValue: "first",
      initialValue: "plain-initial",
      secret: false,
      sourceEnv: "env",
    },
    {
      key: "secret",
      currentValue: "secret-current",
      initialValue: "secret-initial",
      secret: true,
      sourceEnv: "env",
    },
    {
      key: "emptied",
      currentValue: "",
      initialValue: "emptied-initial",
      secret: false,
      sourceEnv: "env",
    },
    {
      key: "noLocalValue",
      currentValue: "noLocalValue-stored",
      initialValue: "noLocalValue-initial",
      secret: false,
      sourceEnv: "env",
    },
    {
      key: "noSecretValue",
      currentValue: "",
      initialValue: "",
      secret: true,
      sourceEnv: "env",
    },
    {
      key: "globalPlain",
      currentValue: "global-current",
      initialValue: "globalPlain-initial",
      secret: false,
      sourceEnv: "Global",
    },
    {
      key: "globalSecret",
      currentValue: "global-secret-current",
      initialValue: "global-secret-initial",
      secret: true,
      sourceEnv: "Global",
    },
  ]

  test("getAggregateEnvsWithCurrentValue resolves values by variable index", () => {
    expect(withoutPredefined(getAggregateEnvsWithCurrentValue())).toEqual(
      expected
    )
  })

  test("aggregateEnvsWithCurrentValue$ resolves values by variable index", async () => {
    const envs = await firstValueFrom(aggregateEnvsWithCurrentValue$)

    expect(withoutPredefined(envs)).toEqual(expected)
  })
})
