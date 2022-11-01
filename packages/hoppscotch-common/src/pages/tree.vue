<template>
  <SmartTree :adapter="adapter">
    <template #content="{ node, toggleChildren }">
      <h2
        v-if="node.type === 'folders'"
        class="bg-blue-600 p-2"
        @click="toggleChildren"
      >
        {{ node.data.name }} - {{ node.data.id }}
        <p v-if="!node.data.folders && !node.data.requests">EMPTY FOLDER</p>
      </h2>
      <h2 v-else-if="node.type === 'requests'" class="bg-red-900 p-2">
        {{ node.data.name }}
      </h2>
      <h2
        v-else-if="node.type === 'collections'"
        class="bg-red-300 p-2"
        @click="toggleChildren"
      >
        {{ node.data.name }}
        <p v-if="!node.data.folders && !node.data.requests">EMPTY COLLECTION</p>
      </h2>
      <h2 v-else>
        {{ node.data.name }}
      </h2>
    </template>
    <template #emptyRoot>
      <h2 class="bg-yellow-200 p-2">Empty Root Node</h2>
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
        requests: [
          {
            id: 211,
            name: "Request 211",
            description: "Request node 211",
            icon: "file",
          },
          {
            id: 222,
            name: "Request 222",
            description: "Request node 222",
            icon: "file",
          },
        ],
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
  {
    id: 5,
    name: "Root 5",
    description: "Root node 5",
    icon: "folder",
    folders: [],
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
      } else {
        return null
      }
    }

    return null
  }

  getChildren(id: string | null) {
    if (id === null) {
      return this.data.map((item) => ({
        type: "collections",
        id: item.id.toString(),
        data: item,
      }))
    }

    const item = this.findItem(this.data, id.toString())

    console.log("adapter-item", item)

    if (item) {
      if (objHasProperty("folders")(item) && objHasProperty("requests")(item)) {
        return [
          ...item.folders.map((item) => ({
            type: "folders",
            id: item.id.toString(),
            data: item,
          })),
          ...item.requests.map((item) => ({
            type: "requests",
            id: item.id.toString(),
            data: item,
          })),
        ]
      }

      if (objHasProperty("folders")(item)) {
        return item.folders.map((item) => ({
          type: "folders",
          id: item.id.toString(),
          data: item,
        }))
      }

      if (objHasProperty("requests")(item)) {
        return (item.requests as Request[]).map((item) => ({
          type: "requests",
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
