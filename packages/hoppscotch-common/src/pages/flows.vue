<template>
  <VueFlow :nodes="nodes" :edges="edges">
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
    <template #node-block-menu="node">
      <FlowsBlockMenu v-bind="node" />
    </template>
    <Background class="bg-[#000000]" />

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

const nodes = ref([
  {
    id: "2",
    position: { x: 100, y: 100 },
    data: { label: "start", loading: true },
  },
  {
    id: "3",
    type: "sendRequest",
    position: { x: 400, y: 200 },
    data: { loading: false, responseData: null },
  },
  {
    id: "4",
    type: "outputResponse",
    position: { x: 600, y: 100 },
    data: { label: "Node 4" },
  },
  {
    id: "5",
    type: "selector",
    position: { x: 900, y: 50 },
    data: { label: "Node 5" },
  },
  {
    id: "6",
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
    position: { x: 160, y: 320 },
  },
])

const edges = ref([
  {
    id: "e1->2",
    source: "1",
    target: "2",
  },
  {
    id: "e2->3",
    source: "2",
    target: "3",
    targetHandle: "target-from",
  },
  {
    id: "e2->4",
    source: "2",
    target: "4",
    targetHandle: "target-from",
  },
  {
    id: "e2->5",
    source: "2",
    target: "5",
    targetHandle: "target-from",
  },
  {
    id: "e2->6",
    source: "2",
    target: "6",
    targetHandle: "target-from",
  },
])

const restCollections = useReadonlyStream(restCollections$, [], "deep")

const { updateNode, onConnect, addEdges } = useVueFlow()

onConnect((connection) => {
  addEdges(connection)
})

const start = () => {
  updateNode("2", (node) => ({
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

  @apply bg-accentLight;
}

.controls__play {
  @apply p-3 rounded cursor-pointer bg-primaryDark hover:bg-primaryLight;
}
</style>
