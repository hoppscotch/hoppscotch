/* eslint-disable vue/one-component-per-file */
import { TestContainer } from "dioc/testing"
import { diocPlugin } from "dioc/vue"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createApp, defineComponent, h, nextTick, ref, type App } from "vue"

vi.mock("@composables/i18n", () => ({ useI18n: () => (key: string) => key }))
vi.mock("@composables/toast", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}))
vi.mock("~/platform", () => ({
  platform: { auth: { getCurrentUser: () => null } },
}))

import PersonalEnvironments from "~/components/environments/my/index.vue"
import Details from "~/components/environments/my/Details.vue"
import { invokeAction } from "~/helpers/actions"
import { environmentsStore, replaceEnvironments } from "~/newstore/environments"

// Keep the real list, modal, action handlers, and environment store. The
// generic UI slots and CodeMirror inputs do not participate in target lookup.
const Slot = defineComponent({
  setup:
    (_, { slots }) =>
    () =>
      h("div", [slots.default?.(), slots.body?.()]),
})

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

describe("personal environment edit actions", () => {
  let app: App
  let root: HTMLDivElement
  const details = ref<InstanceType<typeof Details> | null>(null)
  let previousEnvironments: typeof environmentsStore.value.environments

  beforeEach(() => {
    previousEnvironments = environmentsStore.value.environments
    replaceEnvironments(
      ["Zulu", "Alpha"].map((name) => ({
        v: 2,
        id: name,
        name,
        variables: [
          {
            key: `${name}_KEY`,
            initialValue: "initial",
            currentValue: "current",
            secret: false,
          },
        ],
      }))
    )

    root = document.createElement("div")
    app = createApp(PersonalEnvironments)
    app.use(diocPlugin, { container: new TestContainer() })
    app.provide("colorMode", { value: "dark" })
    app.directive("tippy", {})
    app.directive("focus", {})
    for (const name of [
      "HoppButtonSecondary",
      "HoppButtonPrimary",
      "HoppSmartPlaceholder",
      "HoppSmartModal",
      "HoppSmartInput",
      "HoppSmartItem",
      "HoppSmartTabs",
      "HoppSmartTab",
      "EnvironmentsMyEnvironment",
      "EnvironmentsImportExport",
      "SmartEnvInput",
      "IconLucideSearch",
      "tippy",
    ])
      app.component(name, Slot)
    app.component(
      "EnvironmentsMyDetails",
      defineComponent({
        setup:
          (_, { attrs }) =>
          () =>
            h(Details, { ...attrs, ref: details }),
      })
    )
    app.mount(root)
  })

  afterEach(() => {
    app.unmount()
    replaceEnvironments(previousEnvironments)
  })

  const filter = async (value: string) => {
    const input = root.querySelector<HTMLInputElement>('input[type="search"]')!
    input.value = value
    input.dispatchEvent(new Event("input", { bubbles: true }))
    await nextTick()
  }

  it.each([
    { name: "Zulu", index: 0 },
    { name: "Alpha", index: 1 },
  ])(
    "opens $name using its store index rather than its sorted position",
    async ({ name, index }) => {
      invokeAction("modals.my.environment.edit", {
        envName: name,
        variableName: `${name}_KEY`,
      })
      await tick()

      expect(details.value?.$props).toMatchObject({
        show: true,
        editingEnvironmentIndex: index,
        editingVariableName: `${name}_KEY`,
      })
      expect(
        root.querySelector<HTMLInputElement>('input[name="variable0"]')?.value
      ).toBe(`${name}_KEY`)
    }
  )

  it.each(["Alpha", " \t"])(
    "opens a target hidden by the sidebar filter %j",
    async (search) => {
      await filter(search)

      invokeAction("modals.my.environment.edit", {
        envName: "Zulu",
        variableName: "Zulu_KEY",
      })
      await tick()

      expect(details.value?.$props).toMatchObject({
        show: true,
        editingEnvironmentIndex: 0,
        editingVariableName: "Zulu_KEY",
      })
      expect(
        root.querySelector<HTMLInputElement>('input[name="variable0"]')?.value
      ).toBe("Zulu_KEY")
    }
  )

  it.each(["Missing", "Global"])(
    "keeps the open modal's editing target when the action is for %s",
    async (envName) => {
      invokeAction("modals.my.environment.edit", {
        envName: "Zulu",
        variableName: "Zulu_KEY",
      })
      await tick()

      invokeAction("modals.my.environment.edit", {
        envName,
        variableName: "Alpha_KEY",
        isSecret: true,
      })
      await tick()

      expect(details.value?.$props).toMatchObject({
        show: true,
        editingEnvironmentIndex: 0,
        editingVariableName: "Zulu_KEY",
        isSecretOptionSelected: false,
      })
    }
  )
})
