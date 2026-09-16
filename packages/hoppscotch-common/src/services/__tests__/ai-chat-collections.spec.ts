import { beforeEach, describe, expect, it, vi } from "vitest"
import { TestContainer } from "dioc/testing"
import { makeCollection } from "@hoppscotch/data"

// Same module-scope circularity the teardown spec works around.
vi.mock("~/modules/i18n", () => ({
  getI18n: () => (key: string) => key,
  APP_LANGUAGES: [],
  changeAppLanguage: () => {},
}))

vi.mock("~/platform", () => ({
  platform: {
    experiments: { aiExperiments: { chat: vi.fn() } },
    auth: {
      getCurrentUser: () => null,
      getCurrentUserStream: () => ({ subscribe: () => ({ unsubscribe() {} }) }),
    },
  },
}))

import { AIChatService } from "../ai-chat.service"
import { APP_ACTION_TOOLS } from "~/helpers/aichat/app-actions"
import { restCollectionStore, setRESTCollections } from "~/newstore/collections"

/** Reaches past `private` to drive one handler without a whole turn. */
type Internals = {
  renameCollection(name: string, newName: string): Promise<string>
  deleteCollection(name: string): Promise<string>
}

const inner = (c: AIChatService) => c as unknown as Internals

const collection = (name: string, folders: unknown[] = []) =>
  makeCollection({
    name,
    folders: folders as never,
    requests: [],
    auth: { authType: "inherit", authActive: true },
    headers: [],
    variables: [],
    description: null,
    preRequestScript: "",
    testScript: "",
  })

const names = () => restCollectionStore.value.state.map((c) => c.name)

describe("AIChatService collection rename and delete", () => {
  let chat: AIChatService

  beforeEach(() => {
    chat = new TestContainer().bind(AIChatService)
    setRESTCollections([collection("Auth"), collection("Billing")])
  })

  it("registers both as app actions, not request-field edits", () => {
    // Routing is by name: a tool missing here reaches the request editor
    // instead and silently does nothing.
    expect(APP_ACTION_TOOLS.has("rename_collection")).toBe(true)
    expect(APP_ACTION_TOOLS.has("delete_collection")).toBe(true)
  })

  describe("rename", () => {
    it("renames a top-level collection", async () => {
      const reply = await inner(chat).renameCollection("Auth", "Identity")

      expect(names()).toEqual(["Identity", "Billing"])
      expect(reply).toContain("Identity")
    })

    it("matches the name case-insensitively", async () => {
      await inner(chat).renameCollection("auth", "Identity")
      expect(names()).toEqual(["Identity", "Billing"])
    })

    it("renames a nested folder found by its own name", async () => {
      setRESTCollections([collection("Auth", [collection("v1")])])

      await inner(chat).renameCollection("v1", "v2")

      expect(restCollectionStore.value.state[0].folders[0].name).toBe("v2")
    })

    it("leaves everything alone when the name matches nothing", async () => {
      const reply = await inner(chat).renameCollection("Nope", "Whatever")

      expect(names()).toEqual(["Auth", "Billing"])
      expect(reply).toContain("couldn't find")
    })

    it("asks for the new name rather than blanking it", async () => {
      const reply = await inner(chat).renameCollection("Auth", "")

      expect(names()).toEqual(["Auth", "Billing"])
      expect(reply).toContain("rename it to")
    })
  })

  describe("delete", () => {
    it("deletes a top-level collection", async () => {
      const reply = await inner(chat).deleteCollection("Billing")

      expect(names()).toEqual(["Auth"])
      expect(reply).toContain("Billing")
    })

    it("deletes a nested folder without taking its parent", async () => {
      setRESTCollections([collection("Auth", [collection("v1")])])

      await inner(chat).deleteCollection("v1")

      expect(names()).toEqual(["Auth"])
      expect(restCollectionStore.value.state[0].folders).toEqual([])
    })

    // The property that matters most: this is irreversible, so a near miss has
    // to do nothing rather than guess at the closest collection.
    it("deletes nothing when the name matches nothing", async () => {
      const reply = await inner(chat).deleteCollection("Bill")

      expect(names()).toEqual(["Auth", "Billing"])
      expect(reply).toContain("couldn't find")
    })

    it("deletes nothing when given an empty name", async () => {
      const reply = await inner(chat).deleteCollection("")

      expect(names()).toEqual(["Auth", "Billing"])
      expect(reply).toContain("Which collection")
    })
  })
})
