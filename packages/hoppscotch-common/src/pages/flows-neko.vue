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

const t = useI18n()

const nodes = ref([
  {
    id: "1",
    type: "input",
    data: { label: "Node 1" },
    position: { x: 0, y: 0 },
  },
  {
    id: "2",
    type: "block-menu",
    data: {
      nodes: [
        {
          title: t("navigation.rest"),
          description: "Short description",
          icon: IconFlows,
        },
        {
          title: t("navigation.graphql"),
          description: "Short description",
          icon: IconFlows,
        },
        {
          title: t("navigation.realtime"),
          description: "Short description",
          icon: IconFlows,
        },
      ],
    },
    position: { x: 128, y: 128 },
  },
])

const edges = ref([
  {
    id: "1->2",
    source: "1",
    target: "2",
  },
])
</script>

<style>
@import "@vue-flow/core/dist/style.css";
@import "@vue-flow/core/dist/theme-default.css";
</style>
