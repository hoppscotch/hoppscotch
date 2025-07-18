<template>
  <div class="flex h-screen overflow-hidden bg-primary text-secondary">
    <div class="flex-1 flex flex-col overflow-hidden">
      <main class="flex-1 overflow-y-auto bg-primary">
        <div class="container mx-auto flex items-center justify-center">
          <Suspense>
            <RouterView />
          </Suspense>
        </div>
      </main>
    </div>
    <Toaster position="bottom-right" rich-colors />
  </div>
</template>

<script setup lang="ts">
import { Toaster } from "@hoppscotch/ui"
</script>
