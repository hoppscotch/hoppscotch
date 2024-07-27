<template>
    <NodeResizer min-width="300" min-height="100" />

    <div class="bg-primary rounded border border-dividerLight">
        <div class="flex justify-start items-center gap-2 p-2">
            <icon-lucide-link class="svg-icons text-slate-500" />
            <span class="text-white font-semibold text-xs">Body</span>
        </div>
        <div class="flex items-center whitespace-nowrap border-b border-dividerLight text-tiny text-secondaryLight">
        </div>
        <div class="">
            <JsonViewer :data="body" :selector=true />
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
        const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');
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
    from: 18,
}

</script>