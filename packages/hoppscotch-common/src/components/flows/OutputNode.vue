<template>
  <NodeResizer min-width="300" min-height="100" />

  <div class="bg-primary rounded border border-dividerLight">
    <div class="flex justify-start items-center gap-2 p-2">
      <span
        class="inline-flex items-center rounded-md bg-green-950 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20"
        :class="statusClass">{{ status }}</span>
      <span class="text-white font-semibold text-xs">{{ statusText }}</span>
    </div>
    <div class="flex items-center whitespace-nowrap border-b border-dividerLight text-tiny text-secondaryLight"></div>
    <div class="">
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
    top: handlePositions.from + 'px',
  }" />
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import JsonViewer from './JsonViewer.vue';
import { Handle, Position } from "@vue-flow/core";
import { NodeResizer } from '@vue-flow/node-resizer'

const props = defineProps<{
  responseData?: {
    status: number | string;
    statusText: string;
    headers: Record<string, string>;
    body: Record<string, any>;
  };
}>();

const status = ref<number | string>(props.responseData?.status || '');
const statusText = ref(props.responseData?.statusText || '');
const headers = ref<Record<string, string>>(props.responseData?.headers || {});
const body = ref<Record<string, any>>(props.responseData?.body || {});
const showBody = ref(false);
const showHeaders = ref(false);

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

const fetchSampleResponse = async () => {
  try {
    const response = await fetch('https://api.restful-api.dev/objects');
    const data: ResponseData = await response.json();
    status.value = response.status;
    statusText.value = response.statusText === "" ? response.ok ? "OK" : "Not OK" : response.statusText;
    headers.value = Object.fromEntries(response.headers.entries());
    body.value = data;
  } catch (error) {
    status.value = 'ERROR';
  }
};

onMounted(() => {
  if (!props.responseData) {
    fetchSampleResponse();
  }
});

const handlePositions = {
  from: 22,
}

</script>
