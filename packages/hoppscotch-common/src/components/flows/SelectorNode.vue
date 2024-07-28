<template>
    <NodeResizer min-width="300" min-height="100" />

    <div class="bg-primary rounded border border-dividerLight" :class="{
        'animate-pulse': nodeStatus === 2,
    }">
        <div class="flex justify-between items-center pr-2">
            <div class="flex justify-start items-center gap-2 p-2">
                <icon-lucide-mouse-pointer-click class="svg-icons text-slate-500" />
                <span class="text-white font-semibold  text-xs">Body</span>
            </div>
            <span class="text-sky-700 font-semibold text-xs">{{ searchKey }}</span>
        </div>
        <div class="flex items-center whitespace-nowrap border-b border-dividerLight text-tiny text-secondaryLight">
        </div>
        <div class="px-2 py-1">
            <HoppSmartInput v-model="searchKey" placeholder="Enter the key" class="search-input" />
        </div>
        <JsonViewer v-if="searchKey != ''" :data="parseBody(searchKey)" />
    </div>
    <Handle id="target-from" type="target" :position="Position.Left" :style="{
        top: handlePositions.from + 'px',
    }" />
    <Handle id="source-key" type="source" :position="Position.Right" :style="{
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

const searchKey = ref("")
const body = ref<Record<string, any>>(props.responseData?.body || {});
const nodeStatus = ref(0);
const { getNode, updateNodeData, getConnectedEdges } = useVueFlow();

const formatValue = (value: any): string => {
    if (typeof value === 'string') return `"${value}"`;
    return String(value);
};

const isObject = (value: any): boolean => {
    return value && typeof value === 'object';
};

const parseBody = (expr) => {
    const arr = [
        {
            name: "xd",
            age: 8
        },
        {
            name: "no",
            passport: {
                id: 23
            }
        }
    ];

    try {
        let ret = arr;
        if (isObject(expr)) {
            for (const key of expr.split('.')) {
                if (ret && key in ret) {
                    ret = ret[key];
                } else {
                    return undefined;
                }
            }
            return ret;
        } else {
            const keys = expr.split('.');
            const lastKey = keys[keys.length - 1];
            ret = arr;
            for (const key of keys.slice(0, -1)) {
                if (ret && key in ret) {
                    ret = ret[key];
                } else {
                    return undefined;
                }
            }
            return { [lastKey]: ret[lastKey] };
        }
    } catch (error) {
        console.error("Error parsing expression:", error);
        return undefined;
    }
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