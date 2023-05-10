<template>
  <div class="flex flex-col flex-1">
    <HttpResponseMeta :response="tab.response" />
    <LensesResponseBodyRenderer
      v-if="!loading && hasResponse"
      v-model:selected-tab-preference="selectedTabPreference"
      v-model:tab="tab"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import { HoppRESTTab } from "~/helpers/rest/tab"
import { useVModel } from "@vueuse/core"

const props = defineProps<{
  tab: HoppRESTTab
}>()

const emit = defineEmits<{
  (e: "update:tab", val: HoppRESTTab): void
}>()

const tab = useVModel(props, "tab", emit)

const selectedTabPreference = ref<string | null>(null)

const hasResponse = computed(
  () =>
    tab.value.response?.type === "success" ||
    tab.value.response?.type === "fail"
)

const loading = computed(() => tab.value.response?.type === "loading")
</script>
