<template>
  <NodeResizer min-width="300" min-height="100" />

  <div class="bg-primary rounded border border-dividerLight" :class="{
    'animate-pulse': nodeStatus === 2,
  }">
    <div class="flex justify-start items-center gap-2 p-2">
      <span v-if="nodeStatus === 1"
        class="inline-flex items-center rounded-md bg-green-950 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20"
        :class="statusClass">{{ status }}</span>
      <span v-if="nodeStatus === 1" class="text-white font-semibold text-xs">{{ statusText }}</span>
      <icon-lucide-eye v-if="nodeStatus != 1" class="svg-icons text-slate-500" />
      <span v-if="nodeStatus != 1" class="text-white font-semibold text-xs">Output</span>
    </div>
    <div class="flex items-center whitespace-nowrap border-b border-dividerLight text-tiny text-secondaryLight"></div>
    <div v-if="nodeStatus != 1" class="h-36 flex items-center justify-center">
      <span v-if="nodeStatus === 0" class="text-slate-500 text-md">Response will be displayed here</span>
      <span v-if="nodeStatus === 2" class="text-slate-500 text-md">Fetching response</span>
      <span v-if="nodeStatus === 3" class="text-md text-slate-500 text-center px-4 font-light">Make sure you there will
        be a output to displayed</span>
    </div>
    <div v-if="nodeStatus === 1" class="">
      <div class="">
        <button @click="toggleBody" class="flex px-1 py-2 gap-1 hover:bg-primaryDark w-full">
          <icon-lucide-chevron-up v-if="showBody" class="svg-icons text-slate-500" />
          <icon-lucide-chevron-down v-else class="svg-icons text-slate-500" />
          <span class=" text-slate-100 text-xs font-semibold">Body</span>
        </button>
        <div v-if="showBody" class="section-content">
          <div class="flex items-center whitespace-nowrap border-b border-dividerLight text-tiny text-secondaryLight">
          </div>
          <JsonViewer :data="body" />
        </div>
        <div class="flex items-center whitespace-nowrap border-b border-dividerLight text-tiny text-secondaryLight">
        </div>
      </div>
      <div class="">
        <button @click="toggleHeaders" class="flex px-1 py-2 gap-1 hover:bg-primaryDark w-full">
          <icon-lucide-chevron-up v-if="showHeaders" class="svg-icons text-slate-500" />
          <icon-lucide-chevron-down v-else class="svg-icons text-slate-500" />
          <span class=" text-slate-100 text-xs font-semibold">Headers</span>
        </button>
        <div v-if="showHeaders" class="section-content">
          <div class="flex items-center whitespace-nowrap border-b border-dividerLight text-tiny text-secondaryLight">
          </div>
          <table class="w-full divide-y mb-1 divide-slate-600">
            <tbody>
              <tr v-for="(value, key) in headers" :key="key" class="divide-x divide-slate-600"
                style="border-bottom: 1px solid #4a5568;">
                <td class="px-2 py-0.25 text-xs font-medium text-gray-600 text-left">{{ key }}</td>
                <td class="px-2 py-0.25 text-xs text-gray-300 text-left">{{ value }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
  <Handle id="target-from" type="target" :position="Position.Left" :style="{
    top: nodeStatus === 1 ? handlePositions.from : handlePositions.fromHeader + 'px',
  }" />
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import JsonViewer from './JsonViewer.vue';
import {
  Handle, Position, useHandleConnections, useNodesData, useVueFlow
} from "@vue-flow/core";
import { NodeResizer } from '@vue-flow/node-resizer';

const { getNode, updateNodeData, getConnectedEdges } = useVueFlow()

const props = defineProps<{
  id: string
  data: {
    loading: boolean
  }
}>()

const status = ref<number | string>();
const statusText = ref('');
const headers = ref<Record<string, string>>({});
const body = ref<Record<string, any>>({});
const showBody = ref(false);
const showHeaders = ref(false);
const nodeStatus = ref(0);


const statusClass = computed(() => {
  if (typeof status.value === 'number' && status.value >= 200 && status.value < 300) {
    return 'bg-green-950 text-green-700 ring-green-600/20';
  } else if (typeof status.value === 'number' && status.value >= 400 && status.value < 500) {
    return 'bg-red-950 text-red-700 ring-red-600/20';
  } else {
    return 'bg-yellow-950 text-yellow-700 ring-yellow-600/20';
  }
});

const toggleBody = () => {
  showBody.value = !showBody.value;
};

const toggleHeaders = () => {
  showHeaders.value = !showHeaders.value;
};

const handleConnections = useHandleConnections({
  id: "target-from",
  type: "target",
})

const nodesData = useNodesData(() =>
  handleConnections.value.map((connection) => connection.source)
)

watch([nodesData], async () => {
  let sourceLoading;
  let responseData;
  const node = nodesData.value[0];

  if (node) {
    responseData = node.data.responseData;
    sourceLoading = node.data.loading;
  }

  if (!sourceLoading && responseData) {
    try {
      nodeStatus.value = 1;//success
      status.value = responseData.status;
      statusText.value = responseData.statusText;
      headers.value = responseData.headers;
      body.value = responseData.body;
    } catch (error) {
      nodeStatus.value = 3;//error
    }
  } else if (sourceLoading) {
    nodeStatus.value = 2;//loading
  } else {
    nodeStatus.value = 3;//error
  }

  updateNodeData(props.id, {
    loading: false
  })
})

const handlePositions = {
  from: 22,
  fromHeader: 16,
}

</script>
