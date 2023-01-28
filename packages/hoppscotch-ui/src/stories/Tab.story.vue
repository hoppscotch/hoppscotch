<template>
  <Story title="Tab">
    <Variant title="Single">
      <SmartTabs id="my-tab" v-model="selectedTab" render-inactive-tabs>
        <SmartTab id="tab1" label="Tab 1">
          <h1>Tab 1 content</h1>
        </SmartTab>
        <SmartTab id="tab2" label="Tab 2">
          <h1>Tab 2 content</h1>
        </SmartTab>
      </SmartTabs>
    </Variant>
  </Story>
</template>

<script setup lang="ts">
import { ref } from "vue"

const selectedTab = ref("tab1")
</script>
