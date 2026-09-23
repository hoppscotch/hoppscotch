import { beforeEach, describe, expect, it, vi } from "vitest"
import { TestContainer } from "dioc/testing"
import * as E from "fp-ts/Either"

vi.mock("~/modules/i18n", () => ({
  getI18n: () => (key: string) => key,
  APP_LANGUAGES: [],
  changeAppLanguage: () => {},
}))

const ai = vi.hoisted(() => ({
  chat: vi.fn(),
  getChatAvailability: vi.fn(),
}))
vi.mock("~/platform", () => ({
  platform: {
    experiments: { aiExperiments: ai },
    auth: {
      getCurrentUser: () => null,
      getCurrentUserStream: () => ({ subscribe: () => ({ unsubscribe() {} }) }),
    },
  },
}))

import { AIChatService } from "../ai-chat.service"

const model = (name: string) => ({
  connectionID: "c1",
  model: name,
  isDefault: true,
})
const answer = (enabled: boolean, models: string[]) =>
  E.right({ enabled, models: models.map(model), skills: [] })

/** A lookup the test answers when it chooses. */
const pending = () => {
  let settle!: (v: unknown) => void
  ai.getChatAvailability.mockReturnValueOnce(new Promise((r) => (settle = r)))
  return (v: unknown) => settle(v)
}

describe("AIChatService overlapping availability lookups", () => {
  let chat: AIChatService

  beforeEach(() => {
    ai.getChatAvailability.mockReset()
    chat = new TestContainer().bind(AIChatService)
  })

  it("keeps the newer answer when an older lookup finishes last", async () => {
    const older = pending()
    const newer = pending()
    const first = chat.loadAvailability()
    const second = chat.loadAvailability()

    newer(answer(true, ["new-model"]))
    await second
    older(answer(false, ["old-model"]))
    await first

    expect(chat.instanceEnabled.value).toBe(true)
    expect(chat.modelOptions.value.map((m) => m.model)).toEqual(["new-model"])
    expect(chat.selectedModel.value?.model).toBe("new-model")
  })

  it("applies an older answer when the newer lookup failed", async () => {
    const older = pending()
    const newer = pending()
    const first = chat.loadAvailability()
    const second = chat.loadAvailability()

    newer(E.left("NETWORK"))
    await second
    older(answer(true, ["m"]))
    await first

    expect(chat.instanceEnabled.value).toBe(true)
  })

  it("drops every lookup started before the session ended", async () => {
    const older = pending()
    const lookup = chat.loadAvailability()
    chat.clearAvailability()
    ai.getChatAvailability.mockResolvedValueOnce(answer(false, []))
    await chat.loadAvailability()
    older(answer(true, ["m"]))
    await lookup

    expect(chat.instanceEnabled.value).toBe(false)
    expect(chat.modelOptions.value).toEqual([])
  })
})
