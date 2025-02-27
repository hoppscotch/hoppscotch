<template>
  <div class="flex h-screen overflow-hidden bg-primary text-secondary">
    <LayoutSidebar v-model:expanded="sidebarExpanded" v-model:open="sidebarOpen" />
    <div class="flex-1 flex flex-col overflow-hidden">
      <main class="flex-1 overflow-y-auto bg-primary">
        <div class="container mx-auto flex items-center justify-center">
          <Suspense>
            <RouterView />
          </Suspense>
        </div>
      </main>
    </div>
    <Toaster position="bottom-right" richColors />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { Toaster } from "@hoppscotch/ui"
import LayoutSidebar from "~/components/layout/LayoutSidebar.vue"

const sidebarOpen = ref(false)
const sidebarExpanded = ref(true)
</script>
