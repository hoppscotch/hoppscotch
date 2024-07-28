<template>
    <div class="pl-4">
        <div v-for="(value, key, i) in data" :key="key" class="mb-1">
            <div v-if="isObject(value)">
                <div @click="toggle(key)" class="flex items-center cursor-pointer p-0.5">
                    <icon-lucide-chevron-down v-if="expanded[key]" class="json-icon text-slate-800" />
                    <icon-lucide-chevron-right v-else class="json-icon text-slate-800" />
                    <span class="text-xs font-semibold text-sky-600">{{ key }}: </span>
                    <span class="text-xs ml-1 text-slate-300 text-left font-semibold">
                        {{ objectKeysCount(value) }}
                    </span>
                    <span class="text-xs ml-1 text-slate-700 text-left font-bold">
                        {}
                    </span>
                </div>
                <div v-show="expanded[key]" class="ml-4">
                    <JsonViewer :data="value" :selector=selector />
                </div>
            </div>
            <div v-else class="flex items-center hover:bg-primaryDark">
                <span class="text-xs font-semibold text-sky-600">{{ key }}:</span>
                <span v-if="selector"
                    class="text-xs ml-1 text-slate-500 text-left p-1 overflow-ellipsis overflow-hidden whitespace-nowrap"
                    style="flex: 1">
                    {{ formatValue(value) }}
                </span>
                <span v-else class="text-xs ml-1 text-slate-500 text-left">
                    {{ formatValue(value) }}
                </span>
                <Handle v-if="selector" :id="`source-${key}`" type="source" :position="Position.Right" :style="{
                    top: handlePositions.top + handlePositions.offset * (data.length ?? getObjectLength(data) - 1 - i) + 'px',
                }" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, PropType, withDefaults, watchEffect } from 'vue';
import { Handle, Position } from "@vue-flow/core";

interface JsonData {
    [key: string]: any;
}

const props = withDefaults(
    defineProps<{
        data: JsonData | JsonData[];
        selector?: boolean;
    }>(),
    {
        selector: false,
    }
);

const expanded = ref<Record<string, boolean>>({});

const toggle = (key: string) => {
    expanded.value[key] = !expanded.value[key];
};

const isObject = (value: any): boolean => {
    return value && typeof value === 'object';
};

const objectKeysCount = (obj: JsonData): string => {
    return Object.keys(obj).length + ' keys';
};

const formatValue = (value: any): string => {
    if (typeof value === 'string') return `"${value}"`;
    return String(value);
};

const handlePositions = {
    top: 38,
    offset: 28,
};

const getObjectLength = (obj: JsonData): number => {
    if (Array.isArray(obj)) {
        return obj.length;
    } else if (isObject(obj)) {
        return Object.keys(obj).length;
    } else {
        return 0;
    }
};

</script>

<style scoped>
.overflow-ellipsis {
    text-overflow: ellipsis;
}

.overflow-hidden {
    overflow: hidden;
}

.whitespace-nowrap {
    white-space: nowrap;
}
</style>