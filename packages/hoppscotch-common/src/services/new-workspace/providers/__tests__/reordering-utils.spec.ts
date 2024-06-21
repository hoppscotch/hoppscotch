import { describe, it, expect, beforeEach, test } from "vitest"
import * as E from "fp-ts/Either"
import { moveItems, reorderItems, sortByOrder } from "../teams.workspace"

type Item = {
  id: string
  parentID: string | null
  name: string
  order: string
}

/**
 * test structure we're working with
 *
 * item 1
 *  item 1_1
 *      item_1_1_1
 *      item_1_1_2
 *  item 1_2
 *  item 1_3
 *  item 1_4
 * item 2
 *
 */

describe("reorder items", async () => {
  let items: Item[]

  beforeEach(() => {
    items = [
      { id: "item-1", parentID: null, name: "item 1", order: "a0" },
      { id: "item-1_1", parentID: "item-1", name: "item 1_1", order: "a0" },
      {
        id: "item-1_1_1",
        parentID: "item-1_1",
        name: "item 1_1_1",
        order: "a0",
      },
      {
        id: "item-1_1_2",
        parentID: "item-1_1",
        name: "item 1_1_2",
        order: "a1",
      },
      { id: "item-1_2", parentID: "item-1", name: "item 1_2", order: "a1" },
      { id: "item-1_3", parentID: "item-1", name: "item 1_3", order: "a2" },
      { id: "item-1_4", parentID: "item-1", name: "item 1_4", order: "a3" },
      { id: "item-2", parentID: null, name: "item 2", order: "a1" },
    ]
  })

  test("can reorder items to the top of the list", () => {
    const result = reorderItems("item-2", "item-1", items, "id", "parentID")

    if (E.isLeft(result)) {
      console.log(result.left)
      throw new Error("SOMETHING WENT WRONG WHILE REORDERING")
    }

    expect(sortByOrder(result.right.filter((item) => !item.parentID)))
      .toMatchInlineSnapshot(`
      [
        {
          "id": "item-2",
          "name": "item 2",
          "order": "Zz",
          "parentID": null,
        },
        {
          "id": "item-1",
          "name": "item 1",
          "order": "a0",
          "parentID": null,
        },
      ]
    `)
  })

  test("can reorder items to the bottom of the list", () => {
    const result = reorderItems("item-1", null, items, "id", "parentID")

    if (E.isLeft(result)) {
      console.log(result.left)
      throw new Error("SOMETHING WENT WRONG WHILE REORDERING")
    }

    expect(sortByOrder(result.right.filter((item) => !item.parentID)))
      .toMatchInlineSnapshot(`
      [
        {
          "id": "item-2",
          "name": "item 2",
          "order": "a1",
          "parentID": null,
        },
        {
          "id": "item-1",
          "name": "item 1",
          "order": "a2",
          "parentID": null,
        },
      ]
    `)
  })

  test("can reorder items to the middle of the list", () => {
    // move item-1_3 to above item-1_2
    const result = reorderItems("item-1_3", "item-1_2", items, "id", "parentID")

    if (E.isLeft(result)) {
      console.log(result.left)
      throw new Error("SOMETHING WENT WRONG WHILE REORDERING")
    }

    expect(
      sortByOrder(result.right.filter((item) => item.parentID === "item-1"))
    ).toMatchInlineSnapshot(`
      [
        {
          "id": "item-1_1",
          "name": "item 1_1",
          "order": "a0",
          "parentID": "item-1",
        },
        {
          "id": "item-1_3",
          "name": "item 1_3",
          "order": "a0V",
          "parentID": "item-1",
        },
        {
          "id": "item-1_2",
          "name": "item 1_2",
          "order": "a1",
          "parentID": "item-1",
        },
        {
          "id": "item-1_4",
          "name": "item 1_4",
          "order": "a3",
          "parentID": "item-1",
        },
      ]
    `)
  })

  test("can move an item to another parent with no children", () => {
    // move item-1_1_2 to item-2
    const result = moveItems("item-1_1_2", "item-2", items, "id", "parentID")

    if (E.isLeft(result)) {
      console.log(result.left)
      throw new Error("SOMETHING WENT WRONG WHILE REORDERING")
    }

    // check if the item_1_1_2 is removed from its parent
    expect(
      sortByOrder(result.right.filter((item) => item.parentID === "item-1_1"))
    ).toMatchInlineSnapshot(`
      [
        {
          "id": "item-1_1_1",
          "name": "item 1_1_1",
          "order": "a0",
          "parentID": "item-1_1",
        },
      ]
    `)

    // check if item_1_1_2 is inserted into its destinationParent
    expect(
      sortByOrder(result.right.filter((item) => item.parentID === "item-2"))
    ).toMatchInlineSnapshot(`
      [
        {
          "id": "item-1_1_2",
          "name": "item 1_1_2",
          "order": "a0",
          "parentID": "item-2",
        },
      ]
    `)
  })

  test("can move an item to another parent with children", () => {
    const result = moveItems("item-1_2", "item-1_1", items, "id", "parentID")

    if (E.isLeft(result)) {
      console.log(result.left)
      throw new Error("SOMETHING WENT WRONG WHILE REORDERING")
    }

    expect(
      sortByOrder(result.right.filter((item) => item.parentID === "item-1"))
    ).toMatchInlineSnapshot(`
      [
        {
          "id": "item-1_1",
          "name": "item 1_1",
          "order": "a0",
          "parentID": "item-1",
        },
        {
          "id": "item-1_3",
          "name": "item 1_3",
          "order": "a2",
          "parentID": "item-1",
        },
        {
          "id": "item-1_4",
          "name": "item 1_4",
          "order": "a3",
          "parentID": "item-1",
        },
      ]
    `)

    expect(
      sortByOrder(result.right.filter((item) => item.parentID === "item-1_1"))
    ).toMatchInlineSnapshot(`
      [
        {
          "id": "item-1_1_1",
          "name": "item 1_1_1",
          "order": "a0",
          "parentID": "item-1_1",
        },
        {
          "id": "item-1_1_2",
          "name": "item 1_1_2",
          "order": "a1",
          "parentID": "item-1_1",
        },
        {
          "id": "item-1_2",
          "name": "item 1_2",
          "order": "a2",
          "parentID": "item-1_1",
        },
      ]
    `)
  })

  test("can move an item to root", () => {
    const result = moveItems("item-1_1", null, items, "id", "parentID")

    if (E.isLeft(result)) {
      console.log(result.left)
      throw new Error("SOMETHING WENT WRONG WHILE REORDERING")
    }

    expect(sortByOrder(result.right.filter((item) => item.parentID === null)))
      .toMatchInlineSnapshot(`
      [
        {
          "id": "item-1",
          "name": "item 1",
          "order": "a0",
          "parentID": null,
        },
        {
          "id": "item-2",
          "name": "item 2",
          "order": "a1",
          "parentID": null,
        },
        {
          "id": "item-1_1",
          "name": "item 1_1",
          "order": "a2",
          "parentID": null,
        },
      ]
    `)

    expect(
      sortByOrder(result.right.filter((item) => item.parentID === "item-1"))
    ).toMatchInlineSnapshot(`
      [
        {
          "id": "item-1_2",
          "name": "item 1_2",
          "order": "a1",
          "parentID": "item-1",
        },
        {
          "id": "item-1_3",
          "name": "item 1_3",
          "order": "a2",
          "parentID": "item-1",
        },
        {
          "id": "item-1_4",
          "name": "item 1_4",
          "order": "a3",
          "parentID": "item-1",
        },
      ]
    `)
  })
})
