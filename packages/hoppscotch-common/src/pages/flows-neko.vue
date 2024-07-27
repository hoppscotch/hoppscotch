<template>
  <VueFlow :nodes="nodes" :edges="edges">
    <template #node-block-menu="props">
      <FlowsBlockMenu :id="props.id" :data="props.data" />
    </template>
    <Background />
  </VueFlow>
</template>

<script setup>
import { ref } from "vue"
import { VueFlow } from "@vue-flow/core"
import { Background } from "@vue-flow/background"
import { useI18n } from "@composables/i18n"
import IconFlows from "~icons/hopp/flows"
import SendRequestNode from "~/components/flows/SendRequestNode.vue"

const t = useI18n()

const nodes = ref([
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
          id: 1,
          title: "Send Request",
          description: "Evaluating requests",
          icon: IconFlows,
          block: SendRequestNode,
        },
        {
          id: 2,
          title: t("navigation.graphql"),
          description: "Short description",
          icon: IconFlows,
          block: SendRequestNode,
        },
        {
          id: 3,
          title: t("navigation.realtime"),
          description: "Short description",
          icon: IconFlows,
          block: SendRequestNode,
        },
      ],
    },
    position: { x: 100, y: 100 },
  },
])

const edges = ref([
  {
    id: "0->1",
    source: "0",
    target: "1",
  },
])
</script>

<style>
@import "@vue-flow/core/dist/style.css";
@import "@vue-flow/core/dist/theme-default.css";
</style>
