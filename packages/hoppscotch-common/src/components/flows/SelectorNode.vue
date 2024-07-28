<template>
    <NodeResizer min-width="300" min-height="100" />

    <div class="bg-primary rounded border border-dividerLight" :class="{
        'animate-pulse': nodeStatus === 2,
    }">
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
import { ref, watch } from 'vue';
import JsonViewer from './JsonViewer.vue';
import {
    Handle, Position, useHandleConnections, useNodesData, useVueFlow
} from "@vue-flow/core";
import { NodeResizer } from '@vue-flow/node-resizer'

const props = defineProps<{
    id: string
    data: {
        loading: boolean
    }
}>()

const body = ref<Record<string, any>>(props.responseData?.body || {});
const nodeStatus = ref(0);
const { getNode, updateNodeData, getConnectedEdges } = useVueFlow()

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
    from: 17,
}

</script>