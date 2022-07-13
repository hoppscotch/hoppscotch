<template>
  <div class="flex w-screen h-screen">
    <Splitpanes class="no-splitter" :dbl-click-splitter="false" horizontal>
      <Pane v-if="!zenMode" style="height: auto">
        <AppHeader />
      </Pane>
      <Pane
        :class="spacerClass"
        class="flex flex-1 hide-scrollbar !overflow-auto md:mb-0"
      >
        <Splitpanes
          class="no-splitter"
          :dbl-click-splitter="false"
          :horizontal="!mdAndLarger"
        >
          <Pane
            style="width: auto; height: auto"
            class="hide-scrollbar !overflow-auto hidden md:flex md:flex-col"
          >
            <AppSidenav />
          </Pane>
          <Pane class="flex flex-1 hide-scrollbar !overflow-auto">
            <Splitpanes
              class="no-splitter"
              :dbl-click-splitter="false"
              horizontal
            >
              <Pane class="flex flex-1 hide-scrollbar !overflow-auto">
                <main class="flex flex-1 w-full" role="main">
                  <router-view class="flex flex-1" />
                </main>
              </Pane>
            </Splitpanes>
          </Pane>
        </Splitpanes>
      </Pane>
      <Pane v-if="mdAndLarger" style="height: auto">
        <AppFooter />
      </Pane>
      <Pane
        v-else
        style="height: auto"
        class="hide-scrollbar !overflow-auto flex flex-col fixed inset-x-0 bottom-0 z-10"
      >
        <AppSidenav />
      </Pane>
    </Splitpanes>
    <AppPowerSearch :show="showSearch" @hide-modal="showSearch = false" />
    <AppSupport
      v-if="mdAndLarger"
      :show="showSupport"
      @hide-modal="showSupport = false"
    />
    <AppOptions v-else :show="showSupport" @hide-modal="showSupport = false" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeMount, ref, watch } from 'vue';
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core';
import { Splitpanes, Pane } from "splitpanes";
import "splitpanes/dist/splitpanes.css";
import { RouterView } from 'vue-router'
import { useSetting } from '@composables/settings';
import { defineActionHandler } from '~/helpers/actions';

const showSearch = ref(false)
const showSupport = ref(false)

const fontSize = useSetting("FONT_SIZE")
const expandNavigation = useSetting("EXPAND_NAVIGATION")
const zenMode = useSetting("ZEN_MODE")
const rightSidebar = useSetting("SIDEBAR")
const columnLayout = useSetting("COLUMN_LAYOUT")

const breakpoints = useBreakpoints(breakpointsTailwind)
const mdAndLarger = breakpoints.greater("md")

onBeforeMount(() => {
  if (!mdAndLarger.value) {
    rightSidebar.value = false
    columnLayout.value = true
  }
})

watch(mdAndLarger, () => {
  if (mdAndLarger.value) rightSidebar.value = true
  else {
    rightSidebar.value = false
    columnLayout.value = true
  }
})

defineActionHandler("modals.search.toggle", () => {
  showSearch.value = !showSearch.value
})

defineActionHandler("modals.support.toggle", () => {
  showSupport.value = !showSupport.value
})

const spacerClass = computed(() => {
  if (fontSize.value === "small" && expandNavigation.value)
    return "spacer-small"
  if (fontSize.value === "medium" && expandNavigation.value)
    return "spacer-medium"
  if (fontSize.value === "large" && expandNavigation.value)
    return "spacer-large"
  if (
    (fontSize.value === "small" ||
      fontSize.value === "medium" ||
      fontSize.value === "large") &&
    !expandNavigation.value
  )
    return "spacer-expand"
})


</script>

<style scoped>
.spacer-small {
  margin-bottom: 4.2rem;
}

.spacer-medium {
  margin-bottom: 4.8rem;
}

.spacer-large {
  margin-bottom: 5.5rem;
}

.spacer-expand {
  margin-bottom: 2.9rem;
}

@media screen and (min-width: 768px) {
  .spacer-small {
    margin-bottom: 0;
  }

  .spacer-medium {
    margin-bottom: 0;
  }

  .spacer-large {
    margin-bottom: 0;
  }

  .spacer-expand {
    margin-bottom: 0;
  }
}
</style>
