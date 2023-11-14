<template>
  <AppPaneLayout layout-id="rest-primary">
    <template #primary>
      <div class="flex flex-shrink-0 p-4 overflow-x-auto space-x-2 bg-primary">
        <div class="inline-flex flex-1 gap-8">
          <div v-for="item in arr" :key="item.name" class="flex flex-col">
            <span class="text-xs text-secondaryLight">{{ item.name }}</span>
            <span class="text-sm font-bold text-secondaryDark">
              {{ item.value }}
            </span>
          </div>
        </div>
        <HoppButtonPrimary label="Run" class="w-32" name="connect" />
        <HoppButtonSecondary
          :icon="IconPlus"
          :label="`New Run`"
          filled
          outline
        />
      </div>
    </template>
    <template #secondary>
      <HttpResponse v-model:document="tab.document" />
    </template>
  </AppPaneLayout>
</template>

<script setup lang="ts">
import IconPlus from "~icons/lucide/plus"
import { watch } from "vue"
import { useVModel } from "@vueuse/core"
import { cloneDeep } from "lodash-es"
import { isEqualHoppRESTRequest } from "@hoppscotch/data"
import { HoppTab } from "~/services/tab"
import { HoppRESTDocument } from "~/helpers/rest/document"
import { useI18n } from "~/composables/i18n"

const t = useI18n()

const arr = [
  {
    name: "Collection",
    value: "Twitter API V3",
  },
  {
    name: "Environment",
    value: "None",
  },
  {
    name: "Iteration",
    value: "4",
  },
  {
    name: "Duration",
    value: "6s 123ms",
  },
  {
    name: "Avg. Response Time",
    value: "1.5s",
  },
]

// TODO: Move Response and Request execution code to over here

const props = defineProps<{ modelValue: HoppTab<HoppRESTDocument> }>()

const emit = defineEmits<{
  (e: "update:modelValue", val: HoppTab<HoppRESTDocument>): void
}>()

const tab = useVModel(props, "modelValue", emit)

// TODO: Come up with a better dirty check
let oldRequest = cloneDeep(tab.value.document.request)
watch(
  () => tab.value.document.request,
  (updatedValue) => {
    if (
      !tab.value.document.isDirty &&
      !isEqualHoppRESTRequest(oldRequest, updatedValue)
    ) {
      tab.value.document.isDirty = true
    }

    oldRequest = cloneDeep(updatedValue)
  },
  { deep: true }
)
</script>
