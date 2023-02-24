<template>
  <AppPaneLayout layout-id="gql-primary">
    <template #primary>
      <GraphqlRequestOptions
        v-model="tab.request"
        v-model:response="tab.response"
        :tab-id="tab.id"
      />
    </template>
    <template #secondary>
      <GraphqlResponse :response="tab.response" />
    </template>
  </AppPaneLayout>
</template>

<script setup lang="ts">
import { useVModel } from "@vueuse/core"
import { GQLTab } from "~/newstore/GQLSession"

const props = defineProps<{ modelValue: GQLTab }>()
const emit = defineEmits(["update:modelValue"])

const tab = useVModel(props, "modelValue", emit)
</script>
