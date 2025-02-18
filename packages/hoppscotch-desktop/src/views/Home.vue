<template>
  <div class="flex flex-col w-full max-w-6xl mx-auto p-2 space-y-2">
    <!-- Vendored Section -->
    <div class="border border-primaryLight rounded-xl p-8">
      <div class="flex items-center justify-center space-x-4 mb-8">
        <IconLucideCloud class="h-10 w-10 text-secondaryDark" />
        <div class="flex flex-col">
          <h2 class="text-xl font-semibold text-secondaryDark">Hoppscotch Vendored</h2>
          <p class="text-tiny text-secondary">Connect to our managed service</p>
        </div>
      </div>

      <div class="space-y-6">
        <p class="text-center text-secondary">
          Experience Hoppscotch with zero setup. Perfect for teams and organizations.
        </p>

        <HoppButtonPrimary
          label="Connect to Vendored"
          class="h-10 w-full"
          :loading="isVendoredLoading"
          :disabled="isVendoredLoading || isLoading"
          @click="handleVendoredConnect"
        />
      </div>
    </div>

    <!-- Self-hosted Section -->
    <div class="border border-primaryLight rounded-xl p-8">
      <div class="flex items-center justify-center space-x-4 mb-8">
        <IconLucideServer class="h-10 w-10 text-secondaryDark" />
        <div class="flex flex-col">
          <h2 class="text-xl font-semibold text-secondaryDark">Self-Hosted Server</h2>
          <p class="text-tiny text-secondary">Connect to your own instance</p>
        </div>
      </div>

      <form @submit.prevent="handleConnect" class="flex flex-col space-y-4">
        <div class="flex flex-col space-y-2">
          <HoppSmartInput
            v-model="appUrl"
            :disabled="isLoading || isVendoredLoading"
            placeholder="Enter server URL"
            :error="!!error"
            type="url"
            autofocus
            styles="bg-primaryLight border-divider text-secondaryDark"
            input-styles="floating-input peer w-full px-4 py-2 bg-primaryDark border border-divider rounded text-secondaryDark font-medium transition focus:border-dividerDark disabled:opacity-75"
          >
            <template #prefix>
              <IconLucideGlobe class="text-secondary" />
            </template>
            <template #suffix v-if="!isLoading && !error && appUrl">
              <IconLucideCheck class="text-green-500" />
            </template>
          </HoppSmartInput>
          <span v-if="error" class="text-red-500 text-tiny">Failed to load the app, either the server is offline or varification has failed</span>
        </div>

        <HoppButtonPrimary
          type="submit"
          :disabled="isLoading || isVendoredLoading"
          :loading="isLoading"
          label="Connect"
          class="h-10"
        />

        <div v-if="recentInstances.length" class="flex flex-col">
          <div class="flex items-center gap-2 my-4">
            <div class="h-px bg-divider flex-1" />
            <span class="text-tiny text-secondary uppercase">Recent Connections</span>
            <div class="h-px bg-divider flex-1" />
          </div>

          <div class="flex flex-col space-y-0.5 overflow-y-scroll h-44">
            <div
              v-for="item in recentInstances"
              :key="item.url"
              class="group relative flex items-center px-4 py-2 bg-primaryLight hover:bg-primaryDark rounded-lg"
            >
              <div
                class="flex-1 flex items-center cursor-pointer"
                :class="{ 'opacity-50': isLoading || isVendoredLoading }"
                @click="() => connectToUrl(item.url)"
              >
                <IconLucideServer class="opacity-75 mr-4 text-secondaryDark" />
                <div class="flex flex-col flex-1 min-w-0">
                  <div class="font-semibold truncate text-secondaryDark">{{ item.url }}</div>
                  <p class="text-tiny text-secondary">{{ formatDate(item.lastUsed) }}</p>
                  <span v-if="item.version" class="text-tiny text-secondary">v{{ item.version }}</span>
                </div>
              </div>

              <HoppButtonSecondary
                class="!p-2"
                :icon="item.pinned ? IconLucidePinOff : IconLucidePin"
                :disabled="isLoading || isVendoredLoading"
                @click="() => togglePin(item.url)"
              />
            </div>
          </div>
        </div>

        <div class="flex justify-between pt-4 border-t border-divider">
          <HoppButtonSecondary
            :icon="IconLucideTrash2"
            label="Clear unpinned"
            @click="clearUnpinned"
          />
          <HoppButtonSecondary
            :icon="IconLucideTrash2"
            label="Clear Cache"
            :loading="isClearingCache"
            :disabled="isClearingCache"
            class="!text-red-500"
            @click="handleClearCache"
          />
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { LazyStore } from '@tauri-apps/plugin-store';
import { download, load, clear } from "@hoppscotch/plugin-appload";
import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';

import IconLucideGlobe from "~icons/lucide/globe"
import IconLucideCheck from "~icons/lucide/check"
import IconLucideServer from "~icons/lucide/server"
import IconLucidePin from "~icons/lucide/pin"
import IconLucidePinOff from "~icons/lucide/pin-off"
import IconLucideTrash2 from "~icons/lucide/trash2"
import IconLucideCloud from "~icons/lucide/cloud"

const STORE_PATH = "hopp.store.json";
const MAX_HISTORY = 10;

interface RecentInstance {
  url: string;
  lastUsed: string;
  version: string;
  pinned: boolean;
}

const store = new LazyStore(STORE_PATH);
const recentInstances = ref<RecentInstance[]>([]);
const appUrl = ref("");
const error = ref("");
const isLoading = ref(false);
const isVendoredLoading = ref(false);
const isClearingCache = ref(false);

const normalizeUrl = (url: string): E.Either<Error, string> => pipe(
  E.tryCatch(
    () => {
      const withProtocol = url.startsWith("http") ? url : `http://${url}`;
      const parsedUrl = new URL(withProtocol);
      if (!parsedUrl.port) parsedUrl.port = "3200";
      return parsedUrl.toString();
    },
    (e) => e instanceof Error ? e : new Error(String(e))
  )
);

const formatDate = (date: string): string => pipe(
  new Date(date).getTime() - Date.now(),
  diff => Math.ceil(diff / (1000 * 60 * 60 * 24)),
  days => new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(days, "day")
);

const loadRecentUrls = async () => {
  const instances = await store.get<RecentInstance[]>("recentInstances") || [];
  recentInstances.value = instances.sort((a, b) =>
    b.pinned === a.pinned ? new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime() :
    b.pinned ? 1 : -1
  );
};

const saveRecentUrls = async () => {
  await store.set("recentInstances", recentInstances.value);
  await store.save();
};

const updateRecentUrl = (url: string, version: string) => {
  const existingIndex = recentInstances.value.findIndex(item => item.url === url);
  const newEntry: RecentInstance = {
    url,
    lastUsed: new Date().toISOString(),
    version,
    pinned: existingIndex >= 0 ? recentInstances.value[existingIndex].pinned : false
  };

  if (existingIndex >= 0) {
    recentInstances.value.splice(existingIndex, 1);
  }

  recentInstances.value.unshift(newEntry);

  if (!newEntry.pinned && recentInstances.value.length > MAX_HISTORY) {
    const unpinnedInstances = recentInstances.value.filter(item => !item.pinned);
    if (unpinnedInstances.length > MAX_HISTORY) {
      const lastUnpinned = unpinnedInstances[unpinnedInstances.length - 1];
      const lastIndex = recentInstances.value.findIndex(item => item.url === lastUnpinned.url);
      recentInstances.value.splice(lastIndex, 1);
    }
  }
};

const togglePin = async (url: string) => {
  const index = recentInstances.value.findIndex(item => item.url === url);
  if (index >= 0) {
    recentInstances.value[index].pinned = !recentInstances.value[index].pinned;
    await saveRecentUrls();
  }
};

const clearUnpinned = async () => {
  recentInstances.value = recentInstances.value.filter(item => item.pinned);
  await saveRecentUrls();
};

const handleVendoredConnect = async () => {
  if (isVendoredLoading.value || isLoading.value) return;

  isVendoredLoading.value = true;
  try {
    const loadResp = await load({ bundleName: "Hoppscotch", window: { title: "Hoppscotch" } });
    if (!loadResp.success) throw new Error("Failed to load Hoppscotch Vendored");
  } catch (err) {
    console.error('Failed to connect to vendored:', err);
  } finally {
    isVendoredLoading.value = false;
  }
};

const handleClearCache = async () => {
  if (isClearingCache.value) return;

  isClearingCache.value = true;
  try {
    await clear();
  } catch (err) {
    console.error('Failed to clear cache:', err);
  } finally {
    isClearingCache.value = false;
  }
};

const connectToUrl = async (url: string) => {
  if (isLoading.value || isVendoredLoading.value) return;

  isLoading.value = true;
  error.value = "";

  try {
    const normalizedUrl = pipe(
      url,
      normalizeUrl,
      E.getOrElseW(err => { throw err })
    );

    const downloadResp = await download({ serverUrl: normalizedUrl });
    if (!downloadResp.success) throw new Error("Failed to download bundle");

    updateRecentUrl(normalizedUrl, downloadResp.version);
    await saveRecentUrls();

    const loadResp = await load({ bundleName: downloadResp.bundleName, window: { title: "Hoppscotch" } });
    if (!loadResp.success) throw new Error("Failed to load bundle");
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    isLoading.value = false;
  }
};

const handleConnect = () => {
  if (!appUrl.value) return;
  connectToUrl(appUrl.value);
};

const autoConnectToVendored = async () => {
  await new Promise(resolve => setTimeout(resolve, 50));
  handleVendoredConnect();
};

onMounted(async () => {
  await store.init();
  await loadRecentUrls();
  autoConnectToVendored();
});
</script>
