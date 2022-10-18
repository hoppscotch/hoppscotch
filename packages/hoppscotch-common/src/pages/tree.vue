<template>
  <SmartTree :adapter="adapter">
    <template #content="{ node }">
      <SmartTreeBranch :data="node" :adapter="adapter">
        <template #default="{ data, toggleChildren }">
          <h2 class="bg-blue-200 p-2" @click="toggleChildren">
            {{ data.name }} - {{ data.id }}
          </h2>
        </template>
      </SmartTreeBranch>
    </template>
  </SmartTree>
</template>

<script setup lang="ts">
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

class FakeDataDdapter implements SmartTreeAdapter<any> {
  constructor(public data: any) {}

  findItem(items: any, id: string | null) {
    for (const item of items) {
      if (item.id === id) {
        return item
      }

      if (item.folders) {
        const found: any = this.findItem(item.folders, id)
        if (found) return found
      }
    }
  }

  getChildren(id: string | null) {
    if (id === null) {
      return this.data
    }

    const item = this.findItem(this.data, id)

    if (item) {
      return item.folders
    } else {
      return null
    }
  }
}

const adapter = new FakeDataDdapter(fake_data)
</script>
