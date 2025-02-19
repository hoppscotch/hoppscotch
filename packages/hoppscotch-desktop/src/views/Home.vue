<template>
  <div class="flex flex-col items-center justify-center w-full h-screen bg-primary">
    <div class="flex flex-col items-center space-y-6">
      <div class="flex items-center space-x-4">
        <IconLucideCloud class="h-16 w-16 text-secondaryDark" />
        <div class="flex flex-col">
          <h1 class="text-2xl font-semibold text-secondaryDark">Hoppscotch</h1>
        </div>
      </div>

      <div v-if="isLoading" class="flex flex-col items-center space-y-4">
        <div class="loading-spinner w-10 h-10 border-4 border-t-purple-500 rounded-full animate-spin"></div>
        <p class="text-secondary">Loading Hoppscotch...</p>
      </div>

      <div v-else-if="error" class="flex flex-col items-center space-y-4">
        <IconLucideAlertCircle class="h-10 w-10 text-red-500" />
        <p class="text-red-500">{{ error }}</p>
        <HoppButtonPrimary
          label="Try Again"
          :icon="IconLucideRefreshCw"
          @click="loadVendored"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { LazyStore } from '@tauri-apps/plugin-store';
import { load } from "@hoppscotch/plugin-appload";

import IconLucideCloud from "~icons/lucide/cloud"
import IconLucideAlertCircle from "~icons/lucide/alert-circle"
import IconLucideRefreshCw from "~icons/lucide/refresh-cw"

const STORE_PATH = "hopp.store.json";

interface VendoredInstance {
  type: "vendored";
  displayName: string;
  version: string;
}

interface ConnectionState {
  status: "idle" | "connecting" | "connected" | "error";
  instance?: VendoredInstance;
  target?: string;
  message?: string;
}

const store = new LazyStore(STORE_PATH);
const isLoading = ref(true);
const error = ref("");

const saveConnectionState = async (state: ConnectionState) => {
  try {
    await store.set("connectionState", state);
    await store.save();
  } catch (err) {
    console.error("Failed to save connection state:", err);
  }
};

const loadVendored = async () => {
  isLoading.value = true;
  error.value = "";

  try {
    await store.init();

    const vendoredInstance: VendoredInstance = {
      type: "vendored",
      displayName: "Vendored",
      version: "vendored"
    };

    await saveConnectionState({
      status: "connected",
      instance: vendoredInstance
    });

    const loadResp = await load({
      bundleName: "Hoppscotch",
      window: { title: "Hoppscotch" }
    });

    if (!loadResp.success) {
      throw new Error("Failed to load Hoppscotch Vendored");
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    error.value = errorMessage;

    await saveConnectionState({
      status: "error",
      target: "Vendored",
      message: errorMessage
    });

    isLoading.value = false;
  }
};

onMounted(() => {
  loadVendored();
});
</script>

<style scoped>
.loading-spinner {
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
