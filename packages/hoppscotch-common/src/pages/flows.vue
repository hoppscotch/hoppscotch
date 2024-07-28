<template>
  <VueFlow :nodes="nodes" :edges="edges" fit-view-on-init>
    <template #node-sendRequest="sendRequestProps">
      <FlowsSendRequestNode
        v-bind="sendRequestProps"
        :collections="restCollections"
      />
    </template>
    <template #node-outputResponse="outputProps">
      <FlowsOutputNode v-bind="outputProps" />
    </template>
    <template #node-selector="selectorProps">
      <FlowsSelectorNode v-bind="selectorProps" />
    </template>
    <template #node-block-menu="blockMenuProps">
      <FlowsBlockMenu v-bind="blockMenuProps" />
    </template>
    <template #node-start="startProps">
      <FlowsStartNode v-bind="startProps" />
    </template>
    <Background class="bg-primaryLight" />

    <Controls position="bottom-center">
      <ControlButton class="controls__play" @click="start">
        <icon-lucide-play />
      </ControlButton>
    </Controls>
  </VueFlow>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { VueFlow, useVueFlow } from "@vue-flow/core"
import { Background } from "@vue-flow/background"
import { Controls, ControlButton } from "@vue-flow/controls"
import { restCollections$ } from "~/newstore/collections"
import { useReadonlyStream } from "~/composables/stream"
import IconFlows from "~icons/hopp/flows"
import SendRequestNode from "~/components/flows/SendRequestNode.vue"
import OutputNode from "~/components/flows/OutputNode.vue"
import SelectorNode from "~/components/flows/SelectorNode.vue"

const blockMenuNodeTemplate = (id: string, x: number, y: number) => ({
  id,
  type: "block-menu",
  data: {
    blocks: [
      {
        title: "Send Request",
        description: "Evaluating requests",
        icon: IconFlows,
        block: SendRequestNode,
      },
      {
        title: "Output",
        description: "Short description",
        icon: IconFlows,
        block: OutputNode,
      },
      {
        title: "Selector",
        description: "Short description",
        icon: IconFlows,
        block: SelectorNode,
      },
    ],
  },
  position: { x, y },
})

const nodes = ref([
  {
    id: "1",
    type: "start",
    position: { x: 0, y: 0 },
    data: { loading: true },
  },
  {
    id: "2",
    type: "sendRequest",
    position: { x: 400, y: 200 },
    data: { loading: false, responseData: null },
  },
  {
    id: "3",
    type: "outputResponse",
    position: { x: 600, y: 100 },
    data: {},
  },
  {
    id: "4",
    type: "selector",
    position: { x: 900, y: 50 },
    data: {},
  },
])

const edges = ref([
  {
    id: "1->2",
    source: "1",
    target: "2",
  },
  {
    id: "1->3",
    source: "1",
    target: "3",
  },
  {
    id: "1->4",
    source: "1",
    target: "4",
  },
])

let currentParentNode = "0"
const updateBlockMenuParent = (nodeId: string) => {
  currentParentNode = nodeId
}
const handleBlockMenuAdd = (event) => {
  const blockMenuId = nodes.value.length + 1
  console.log(blockMenuId, currentParentNode)
  if (event.target.classList.contains("vue-flow__container")) {
    const { x, y } = screenToFlowCoordinate({ x: event.x, y: event.y })
    nodes.value.push(blockMenuNodeTemplate(blockMenuId.toString(), x, y))
    currentParentNode !== "0" &&
      edges.value.push({
        id: `${currentParentNode}->${blockMenuId}`,
        source: `${currentParentNode}`,
        target: `${blockMenuId}`,
      })
  }
}

const restCollections = useReadonlyStream(restCollections$, [], "deep")

const {
  updateNode,
  addEdges,
  onConnect,
  onConnectStart,
  onConnectEnd,
  onEdgeUpdate,
  onEdgeUpdateStart,
  onEdgeUpdateEnd,
  screenToFlowCoordinate,
} = useVueFlow()

onConnect((connection) => {
  console.log("onConnect", data)
  addEdges(connection)
})

onConnectStart((data) => {
  console.log("onConnectStart", data)
  updateBlockMenuParent(data.nodeId)
})

onConnectEnd((data) => {
  console.log("onConnectEnd", data)
  handleBlockMenuAdd(data)
})

onEdgeUpdate((data) => {
  console.log("onEdgeUpdate", data)
})

onEdgeUpdateStart((data) => {
  console.log("onEdgeUpdateStart", data)
})

onEdgeUpdateEnd((data) => {
  console.log("onEdgeUpdateEnd", data)
})

const start = () => {
  updateNode("1", (node) => ({
    data: {
      ...node.data,
      loading: false,
    },
  }))
}
</script>

<style>
@import "@vue-flow/core/dist/style.css";
@import "@vue-flow/core/dist/theme-default.css";

.vue-flow__handle {
  height: 12px;
  width: 4px;
  border-radius: 4px;
  border: none;

  @apply bg-accentLight;
}

.controls__play {
  @apply p-3 rounded cursor-pointer bg-primaryDark hover:bg-primaryLight;
}
</style>
