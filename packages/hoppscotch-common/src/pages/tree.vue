<template>
  <SmartTree :adapter="adapter" :transform-function="transformFunction">
    <slot>
      <SmartTreeBranch v-for="item in adapter.treeData.value" :key="item.id">
        <template #content="{ toggleChildren }">
          <div
            class="flex flex-col bg-blue-400 p-4 text-white"
            @click="
              () => {
                toggleChildren()
                getChild(item.id, 'node')
              }
            "
          >
            <h1>{{ item.name }}</h1>
            <h2>{{ item.description }}</h2>
          </div>
        </template>
        <template #child>
          <SmartTreeBranch v-for="child in item.items" :key="child.id">
            <template #content="{ toggleChildren }">
              <div
                class="flex flex-col bg-blue-500 p-4 text-white"
                @click="toggleChildren"
              >
                <h1>{{ child.name }}</h1>
                <h2 @click="getChild(child.id, 'child')">
                  {{ child.description }}
                </h2>
              </div>
            </template>
          </SmartTreeBranch>
        </template>
      </SmartTreeBranch>
    </slot>
  </SmartTree>
</template>

<script setup lang="ts">
import SmartTreeAdapter from "~/helpers/tree/SmartTreeAdapter"

const fake_data = [
  {
    id: 1,
    name: "Root 1",
    description: "Root node 1",
    icon: "folder",
    folders: [
      {
        id: 11,
        name: "Child 1",
        description: "Child 1",
        icon: "folder",
        folders: [
          {
            id: 111,
            name: "Child 1",
            description: "Child 1",
            icon: "folder",
            folders: [],
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

const transformFunction = (data: any) => {
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    icon: data.icon,
    items: data.folders,
  }
}

const adapter = new SmartTreeAdapter(fake_data)

const getChild = (id: string, type: "node" | "child") => {
  adapter.getChildNodes(id.toString(), type)
}
</script>
