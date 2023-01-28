<template>
  <Story title="Auto Complete">
    <div class="h-[50vh]">
      <SmartAutoComplete
        placeholder="Select a header"
        :source="commonHeaders"
        :spellcheck="false"
        :value="header[0].key"
        autofocus
        styles="
                bg-transparent
                flex
                flex-1
                py-1
                px-4
                truncate
              "
        class="flex-1 !flex"
        @input="updateHeader()"
      />
    </div>
  </Story>
</template>

<script setup lang="ts">
import { ref } from "vue"

type GQLHeader = {
  key: string
  value: string
  active: boolean
}

const header = ref<GQLHeader[]>([
  {
    key: "Content-Type",
    value: "application/json",
    active: true,
  },
])

const commonHeaders = [
  "Push-Policy",
  "Retry-After",
  "Signature",
  "Signed-Headers",
  "Server-Timing",
  "SourceMap",
  "Upgrade",
]

const updateHeader = () => {
  // alert("updated")
}
</script>
