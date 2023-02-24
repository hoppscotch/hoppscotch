<template>
  <Story title="Tab">
    <Variant title="Single">
      <HoppSmartTabs id="my-tab" v-model="selectedTab" render-inactive-tabs>
        <HoppSmartTab id="tab1" label="Tab 1">
          <h1>Tab 1 content</h1>
        </HoppSmartTab>
        <HoppSmartTab id="tab2" label="Tab 2">
          <h1>Tab 2 content</h1>
        </HoppSmartTab>
      </HoppSmartTabs>
    </Variant>
  </Story>
</template>

<script setup lang="ts">
import { HoppSmartTabs, HoppSmartTab } from "../components/smart"
import { ref } from "vue"

const selectedTab = ref("tab1")
</script>
