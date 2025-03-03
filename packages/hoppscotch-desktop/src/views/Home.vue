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
        <HoppSmartSpinner />
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
import { invoke } from "@tauri-apps/api/core";

import IconLucideCloud from "~icons/lucide/cloud"
import IconLucideAlertCircle from "~icons/lucide/alert-circle"
import IconLucideRefreshCw from "~icons/lucide/refresh-cw"

const HOME_STORE_PATH = "hopp.store.json";
const APP_STORE_PATH = "hoppscotch.hoppscotch.store";

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

interface StoredData {
  schemaVersion: number;
  metadata: {
    createdAt: string;
    updatedAt: string;
    namespace: string;
  };
  data: unknown;
}

interface StoreData {
  data: {
    [namespace: string]: {
      [key: string]: StoredData;
    };
  };
}

const home_store = new LazyStore(HOME_STORE_PATH);
const app_store = new LazyStore(APP_STORE_PATH);
const isLoading = ref(true);
const error = ref("");

const saveConnectionState = async (state: ConnectionState) => {
  try {
    await home_store.set("connectionState", state);
    await home_store.save();
  } catch (err) {
    console.error("Failed to save connection state:", err);
  }
};

const migrateFromLocalStorage = async () => {
  const keyMappings = {
    settings: "settings",
    collections: "restCollections",
    collectionsGraphql: "gqlCollections",
    environments: "environments",
    history: "restHistory",
    graphqlHistory: "gqlHistory",
    WebsocketRequest: "websocket",
    SocketIORequest: "socketio",
    SSERequest: "sse",
    MQTTRequest: "mqtt",
    globalEnv: "globalEnv",
    restTabState: "restTabs",
    gqlTabState: "gqlTabs",
    secretEnvironments: "secretEnvironments"
  };

  console.log("Starting migration from localStorage to home_store...");
  let migratedCount = 0;

  const storeData: StoreData = {
    data: {
      "persistence.v1": {}
    }
  };

  console.log("Current localStorage keys:", Object.keys(localStorage));

  for (const [oldKey, newKey] of Object.entries(keyMappings)) {
    const data = localStorage.getItem(oldKey);
    if (data) {
      try {
        console.log(`Migrating ${oldKey} to persistence.v1.${newKey}...`);
        let parsedData;

        try {
          parsedData = JSON.parse(data);
        } catch (e) {
          console.error(`Failed to parse ${oldKey} data:`, e);
          continue;
        }

        const storedData: StoredData = {
          schemaVersion: 1,
          metadata: {
            createdAt: new Date().toISOString(),
            namespace: "persistence.v1",
            updatedAt: new Date().toISOString(),
          },
          data: parsedData
        };

        storeData.data["persistence.v1"][newKey] = storedData;

        localStorage.removeItem(oldKey);
        migratedCount++;
        console.log(`Successfully migrated ${oldKey}`);
      } catch (err) {
        console.error(`Failed to migrate ${oldKey}:`, err);
      }
    }
  }

  await app_store.set('data', storeData.data);
  await app_store.save();
  console.log(`Migration complete. Migrated ${migratedCount} items.`);
};

interface UpdateCheckResult {
  status: "completed" | "timeout";
  hasUpdates?: boolean;
}

const loadVendored = async () => {
  isLoading.value = true;
  error.value = "";

  try {
    console.log("Initializing home_store and starting migration process");
    await home_store.init();
    await app_store.init();

    console.log(`Using home_store path: ${HOME_STORE_PATH}`);
    console.log("home_Store initialized successfully");

    try {
      await migrateFromLocalStorage();
      console.log("Migration completed successfully");
    } catch (migrationError) {
      console.error("Migration error:", migrationError);
    }

    let shouldProceedWithLoad = true;

    try {
      console.log("Checking for updates before loading app...");

      const timeoutPromise: Promise<UpdateCheckResult> = new Promise((resolve) => {
        setTimeout(() => {
          console.log("Update check timeout reached, proceeding with app load");
          resolve({ status: "timeout" });
        }, 2000); // TODO: 2s shoud be good?
      });

      const result = await Promise.race([
        invoke('check_updates_available').then(hasUpdates => ({ status: "completed", hasUpdates })),
        timeoutPromise
      ]);

      console.log("Update check result:", result);

      if (result.status === "completed" && result.hasUpdates) {
        console.log("Updates available, handling before loading app");
        shouldProceedWithLoad = false;

        await invoke('install_updates_and_restart');
        // This point would only be reached if install_updates_and_restart
        // doesn't actually restart the app
        return;
      }
    } catch (updateError) {
      console.error("Update check error:", updateError);
      // Continue with loading the app despite update check errors
    }

    if (shouldProceedWithLoad) {
      const vendoredInstance: VendoredInstance = {
        type: "vendored",
        displayName: "Vendored",
        version: "vendored"
      };

      await saveConnectionState({
        status: "connected",
        instance: vendoredInstance
      });

      console.log("Loading vendored app...");
      const loadResp = await load({
        bundleName: "Hoppscotch",
        window: { title: "Hoppscotch" }
      });

      if (!loadResp.success) {
        throw new Error("Failed to load Hoppscotch Vendored");
      }

      console.log("Vendored app loaded successfully");
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("Error loading vendored app:", errorMessage);
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
