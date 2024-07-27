<template>
  <VueFlow :nodes="nodes" :edges="edges">
    <template #node-sendRequest="sendRequestProps">
      <FlowsSendRequestNode
        v-bind="sendRequestProps"
        :collections="restCollections"
      />
    </template>

    <Background />
  </VueFlow>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { VueFlow } from "@vue-flow/core"
import { Background } from "@vue-flow/background"
import { restCollections$ } from "~/newstore/collections"
import { useReadonlyStream } from "~/composables/stream"

const nodes = ref([
  {
    id: "1",
    type: "input",
    position: { x: 250, y: 5 },
    data: { label: "Node 1" },
  },
  {
    id: "2",
    position: { x: 100, y: 100 },
    data: { label: "Node 2" },
  },
  {
    id: "3",
    type: "sendRequest",
    position: { x: 400, y: 200 },
    data: { label: "Node 3" },
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
])

const restCollections = useReadonlyStream(restCollections$, [], "deep")
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
</style>
