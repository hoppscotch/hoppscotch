<template>
  <SmartTree :adapter="adapter">
    <template #content="{ node, toggleChildren }">
      <h2 class="bg-orange-200 p-2" @click="toggleChildren">
        {{ node.data.name }} - {{ node.id }}
      </h2>
    </template>
  </SmartTree>
</template>

<script setup lang="ts">
import { objHasProperty } from "~/helpers/functional/object"
import { SmartTreeAdapter } from "~/helpers/tree/SmartTreeAdapter"

const fake_data = [
  {
    id: 1,
    name: "Root 1",
    description: "Root node 1",
    icon: "folder",
    requests: [
      {
        id: 1,
        name: "Request 1",
        description: "Request node 1",
        icon: "file",
      },
      {
        id: 2,
        name: "Request 2",
        description: "Request node 2",
        icon: "file",
      },
    ],
    folders: [
      {
        id: 11,
        name: "Child 11",
        description: "Child 1",
        icon: "folder",
        requests: [
          {
            id: 1,
            name: "Request 11",
            description: "Request node 1",
            icon: "file",
          },
          {
            id: 2,
            name: "Request 22",
            description: "Request node 2",
            icon: "file",
          },
        ],
        folders: [
          {
            id: 111,
            name: "Child 111",
            description: "Child 1",
            icon: "folder",
            folders: [
              {
                id: 1111,
                name: "Child 1111",
                description: "Child 1",
                icon: "folder",
                folders: [],
              },
            ],
          },
          {
            id: 112,
            name: "Child 2",
            description: "Child 2",
            icon: "folder",
            folders: [],
          },
        ],
      },
      {
        id: 12,
        name: "Child 2",
        description: "Child 2",
        icon: "folder",
      },
    ],
  },
  {
    id: 2,
    name: "Root 2",
    description: "Root node 2",
    icon: "folder",
    folders: [
      {
        id: 21,
        name: "Child 1",
        description: "Child 1",
        icon: "folder",
      },
      {
        id: 22,
        name: "Child 2",
        description: "Child 2",
        icon: "folder",
      },
    ],
  },
  {
    id: 3,
    name: "Root 3",
    description: "Root node 3",
    icon: "folder",
    folders: [
      {
        id: 31,
        name: "Child 1",
        description: "Child 1",
        icon: "folder",
      },
      {
        id: 32,
        name: "Child 2",
        description: "Child 2",
        icon: "folder",
      },
    ],
  },
  {
    id: 4,
    name: "Root 4",
    description: "Root node 4",
    icon: "folder",
    folders: [
      {
        id: 41,
        name: "Child 1",
        description: "Child 1",
        icon: "folder",
        folders: [
          {
            id: 441,
            name: "Child 1",
            description: "Child 1",
            icon: "folder",
          },
          {
            id: 442,
            name: "Child 2",
            description: "Child 2",
            icon: "folder",
          },
        ],
      },
      {
        id: 42,
        name: "Child 2",
        description: "Child 2",
        icon: "folder",
      },
    ],
  },
]

type FakeData = typeof fake_data

type Request = {
  id: number
  name: string
  description: string
  icon: string
}

type Folder = Collection["folders"][number]

type Collection = FakeData[number]

type Node = Collection | Folder | Request | undefined | null

class FakeDataAdapter implements SmartTreeAdapter<Node> {
  constructor(public data: Collection[]) {}

  findItem(items: Node[], id: string | null): Node {
    for (const item of items) {
      if (item) {
        if (item.id.toString() === id) {
          return item
        }

        if (objHasProperty("folders")(item)) {
          const found: Node = this.findItem(item.folders, id)
          if (found) return found
        }

        return null
      } else {
        return null
      }
    }

    return null
  }

  getChildren(id: string | null) {
    if (id === null) {
      return this.data.map((item) => ({
        id: item.id.toString(),
        data: item,
      }))
    }

    const item = this.findItem(this.data, id.toString())

    if (item) {
      if (objHasProperty("folders")(item)) {
        return item.folders.map((item) => ({
          id: item.id.toString(),
          data: item,
        }))
      }

      if (objHasProperty("requests")(item)) {
        return (item.requests as Request[]).map((item) => ({
          id: item.id.toString(),
          data: item,
        }))
      }

      return []
    } else {
      return []
    }
  }
}

const adapter = new FakeDataAdapter(fake_data)
</script>
