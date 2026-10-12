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
  createFolder(parent: string, name: string): Promise<string>
  renameCollection(name: string, newName: string): Promise<string>
  deleteCollection(name: string): Promise<string>
}

const tick = () => new Promise((r) => setTimeout(r, 0))
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

/** Runs a delete and answers the confirmation it raises. */
const deleteAnswering = async (
  chat: AIChatService,
  name: string,
  answer: boolean
) => {
  const done = inner(chat).deleteCollection(name)
  await tick()
  chat.resolveConfirmation(answer)
  return done
}

describe("AIChatService collection tools", () => {
  let chat: AIChatService

  beforeEach(() => {
    chat = new TestContainer().bind(AIChatService)
    setRESTCollections([collection("Auth"), collection("Billing")])
  })

  describe("create folder", () => {
    it("nests a folder inside a top-level collection", async () => {
      const reply = await inner(chat).createFolder("Auth", "v1")

      const folders = restCollectionStore.value.state[0].folders
      expect(folders.map((f) => f.name)).toEqual(["v1"])
      expect(reply).toContain("v1")
      expect(reply).toContain("Auth")
    })

    it("nests a folder inside another folder", async () => {
      await inner(chat).createFolder("Auth", "v1")
      await inner(chat).createFolder("v1", "users")

      const v1 = restCollectionStore.value.state[0].folders[0]
      expect(v1.folders.map((f) => f.name)).toEqual(["users"])
    })

    it("refuses when the parent does not exist", async () => {
      const reply = await inner(chat).createFolder("Nope", "v1")

      expect(restCollectionStore.value.state[0].folders).toEqual([])
      expect(reply).toContain("couldn't find")
    })

    it("does not add a second folder of the same name", async () => {
      await inner(chat).createFolder("Auth", "v1")
      const reply = await inner(chat).createFolder("Auth", "v1")

      expect(restCollectionStore.value.state[0].folders).toHaveLength(1)
      expect(reply).toContain("already has")
    })

    it("asks for a name rather than creating an unnamed folder", async () => {
      const reply = await inner(chat).createFolder("Auth", "")

      expect(restCollectionStore.value.state[0].folders).toEqual([])
      expect(reply).toContain("called")
    })

    // The half that already worked: once the folder exists, the existing
    // name resolver reaches it, so nested deletes and renames apply to it too.
    it("makes the new folder reachable by the other collection tools", async () => {
      await inner(chat).createFolder("Auth", "v1")

      await inner(chat).renameCollection("v1", "v2")
      expect(restCollectionStore.value.state[0].folders[0].name).toBe("v2")

      await deleteAnswering(chat, "v2", true)
      expect(restCollectionStore.value.state[0].folders).toEqual([])
    })
  })

  it("registers all three as app actions, not request-field edits", () => {
    // Routing is by name: a tool missing here reaches the request editor
    // instead and silently does nothing.
    expect(APP_ACTION_TOOLS.has("create_folder")).toBe(true)
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
    it("asks before destroying anything, naming the target", async () => {
      const done = inner(chat).deleteCollection("Billing")
      await tick()

      // Still intact while the question is open.
      expect(chat.pendingConfirmation.value).toMatchObject({
        kind: "collection",
        name: "Billing",
      })
      expect(names()).toEqual(["Auth", "Billing"])

      chat.resolveConfirmation(true)
      await done
      expect(names()).toEqual(["Auth"])
    })

    it("deletes a top-level collection once confirmed", async () => {
      const reply = await deleteAnswering(chat, "Billing", true)

      expect(names()).toEqual(["Auth"])
      expect(reply).toContain("Billing")
    })

    it("keeps the collection when the user declines", async () => {
      const reply = await deleteAnswering(chat, "Billing", false)

      expect(names()).toEqual(["Auth", "Billing"])
      expect(reply).toContain("Left")
    })

    it("clears the prompt once it is answered", async () => {
      await deleteAnswering(chat, "Billing", true)
      expect(chat.pendingConfirmation.value).toBeNull()
    })

    it("settles an open prompt as declined when the chat is reset", async () => {
      const done = inner(chat).deleteCollection("Billing")
      await tick()

      chat.reset()
      const reply = await done

      expect(names()).toEqual(["Auth", "Billing"])
      expect(reply).toContain("Left")
      expect(chat.pendingConfirmation.value).toBeNull()
    })

    it("deletes a nested folder without taking its parent", async () => {
      setRESTCollections([collection("Auth", [collection("v1")])])

      await deleteAnswering(chat, "v1", true)

      expect(names()).toEqual(["Auth"])
      expect(restCollectionStore.value.state[0].folders).toEqual([])
    })

    // The property that matters most: this is irreversible, so a near miss has
    // to do nothing rather than guess at the closest collection.
    it("deletes nothing, and asks nothing, when the name matches nothing", async () => {
      const reply = await inner(chat).deleteCollection("Bill")

      expect(names()).toEqual(["Auth", "Billing"])
      expect(reply).toContain("couldn't find")
      // No target, so there is nothing to put in front of the user.
      expect(chat.pendingConfirmation.value).toBeNull()
    })

    it("deletes nothing when given an empty name", async () => {
      const reply = await inner(chat).deleteCollection("")

      expect(names()).toEqual(["Auth", "Billing"])
      expect(reply).toContain("Which collection")
    })
  })
})
