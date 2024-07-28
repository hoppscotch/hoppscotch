<template>
  <VueFlow :nodes="nodes" :edges="edges">
    <template #node-block-menu="node">
      <FlowsBlockMenu v-bind="node" />
    </template>
    <Background />
  </VueFlow>
</template>

<script setup lang="ts">
import { VueFlow } from "@vue-flow/core"
import { Background } from "@vue-flow/background"
import { useI18n } from "@composables/i18n"
import IconFlows from "~icons/hopp/flows"
import SendRequestNode from "~/components/flows/SendRequestNode.vue"
import OutputNode from "~/components/flows/OutputNode.vue"
import SelectorNode from "~/components/flows/SelectorNode.vue"

const t = useI18n()

const nodes = [
  {
    id: "0",
    type: "input",
    data: { label: "Node 1" },
    position: { x: 0, y: 0 },
  },
  {
    id: "1",
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
    position: { x: 100, y: 100 },
  },
]

const edges = [
  {
    id: "0->1",
    source: "0",
    target: "1",
  },
]
</script>

<style>
@import "@vue-flow/core/dist/style.css";
@import "@vue-flow/core/dist/theme-default.css";
</style>
