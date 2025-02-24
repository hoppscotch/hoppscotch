<template>
  <div class="flex flex-col w-full">
    <div
      v-if="currentInstance"
      class="flex items-center justify-between p-4 hover:bg-primaryLight"
    >
      <div class="flex items-center gap-2">
        <IconLucideServer
          v-if="currentInstance.type === 'server'"
          class="text-secondary"
        />
        <IconLucidePackage v-else class="text-secondary" />
        <span class="font-semibold">{{ currentInstance.displayName }}</span>
      </div>
      <IconLucideCheck class="text-purple-500" />
    </div>

    <div
      v-if="recentInstances.length > 0 && userEmail"
      class="p-4 text-secondary text-sm"
    >
      Organizations for {{ userEmail }}
    </div>

    <div
      class="flex items-center justify-between p-4 hover:bg-primaryLight"
      :class="{ 'cursor-pointer': !isVendored, 'opacity-50': isVendored }"
      @click="!isVendored && connectToVendored()"
    >
      <div class="flex items-center gap-2">
        <IconLucidePackage class="text-secondary" />
        <div class="flex flex-col">
          <span class="font-semibold">Hoppscotch</span>
          <span class="text-xs text-secondary">Vendored app</span>
        </div>
      </div>
      <div class="flex items-center">
        <IconLucideCheck v-if="isVendored" class="text-green-500" />
        <IconLucideArrowRight v-else class="text-secondary" />
      </div>
    </div>

    <div class="flex flex-col">
      <div
        v-for="instance in recentInstances"
        :key="instance.serverUrl"
        class="flex items-center justify-between p-4 hover:bg-primaryLight"
        :class="{ 'opacity-50': isConnectedTo(instance.serverUrl) }"
      >
        <div
          class="flex items-center gap-2 flex-1 cursor-pointer"
          @click="
            !isConnectedTo(instance.serverUrl) &&
              connectToServer(instance.serverUrl)
          "
        >
          <IconLucideServer class="text-secondary" />
          <div class="flex flex-col">
            <span class="font-semibold">{{ instance.displayName }}</span>
            <span v-if="instance.version" class="text-xs text-secondary">
              v{{ instance.version }}
            </span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <HoppButtonSecondary
            v-tippy="{
              content: t('action.remove_instance') || 'Remove instance',
              theme: 'tooltip',
            }"
            class="!p-2"
            :icon="IconLucideTrash"
            @click.stop="removeInstance(instance.serverUrl)"
          />
          <IconLucideCheck
            v-if="isConnectedTo(instance.serverUrl)"
            class="text-green-500"
          />
          <IconLucideArrowRight v-else class="text-secondary" />
        </div>
      </div>
      <div
        class="flex items-center justify-between p-4 hover:bg-primaryLight cursor-pointer"
        :class="{ 'opacity-50': isConnectedTo('localhost') }"
        @click="!isConnectedTo('localhost') && connectToServer('localhost')"
      >
        <div class="flex items-center gap-2">
          <IconLucideServer class="text-secondary" />
          <div class="flex flex-col">
            <span class="font-semibold">Local</span>
            <span class="text-xs text-secondary">Local Self Hosted</span>
          </div>
        </div>
        <div class="flex items-center">
          <IconLucideCheck
            v-if="isConnectedTo('localhost')"
            class="text-green-500"
          />
          <IconLucideArrowRight v-else class="text-secondary" />
        </div>
      </div>
    </div>

    <div
      class="flex items-center gap-2 p-4 hover:bg-primaryLight cursor-pointer border-t border-divider"
      @click="
        () => {
          showAddModal = true
          $emit('close-dropdown')
        }
      "
    >
      <IconLucidePlus class="text-secondary" />
      <span class="text-secondary">Add an instance</span>
    </div>

    <HoppSmartModal
      v-if="showAddModal"
      dialog
      :title="t('instances.add_new') || 'Add New Instance'"
      styles="sm:max-w-md"
      @close="showAddModal = false"
    >
      <template #body>
        <form class="flex flex-col space-y-4" @submit.prevent="handleConnect">
          <div class="flex flex-col space-y-2">
            <HoppSmartInput
              v-model="newInstanceUrl"
              :disabled="isConnecting"
              placeholder="localhost"
              :error="!!connectionError"
              type="url"
              autofocus
              styles="bg-primaryLight border-divider text-secondaryDark"
              input-styles="floating-input peer w-full px-4 py-2 bg-primaryDark border border-divider rounded text-secondaryDark font-medium transition focus:border-dividerDark disabled:opacity-75"
              @submit="handleConnect"
            >
              <template #prefix>
                <IconLucideGlobe class="text-secondary" />
              </template>
              <HoppSmartInput>
                <template #suffix>
                  <IconLucideCheck
                    v-if="
                      !isConnecting &&
                      !connectionError &&
                      newInstanceUrl &&
                      isValidUrl &&
                      !isCurrentUrl
                    "
                    class="text-green-500"
                  />
                  <IconLucideAlertCircle
                    v-else-if="
                      !isConnecting && !connectionError && isCurrentUrl
                    "
                    class="text-amber-500"
                  />
                </template>
              </HoppSmartInput>
            </HoppSmartInput>
            <span v-if="connectionError" class="text-red-500 text-tiny">
              {{ connectionError }}
            </span>
            <span v-else-if="isCurrentUrl" class="text-amber-500 text-tiny">
              {{
                t("instances.already_connected") ||
                "You are already connected to this instance"
              }}
            </span>
          </div>

          <HoppButtonPrimary
            type="submit"
            :disabled="isConnecting || !isValidUrl || isCurrentUrl"
            :loading="isConnecting"
            :label="t('action.connect')"
            class="h-10"
          />
        </form>
      </template>

      <template #footer>
        <div class="flex justify-end w-full">
          <HoppButtonSecondary
            v-tippy="{
              content: t('instances.clear_cached_bundles'),
              theme: 'tooltip',
            }"
            :icon="IconLucideTrash2"
            :label="t('action.clear_cache')"
            :loading="isClearingCache"
            :disabled="isClearingCache"
            class="!text-red-500 hover:!text-red-600"
            @click="handleClearCache"
          />
        </div>
      </template>
    </HoppSmartModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import { useService } from "dioc/vue"
import { useI18n } from "@composables/i18n"
import { useReadonlyStream } from "@composables/stream"
import { platform } from "~/platform"
import {
  InstanceSwitcherService,
  InstanceType,
} from "~/services/instance-switcher.service"

import IconLucideGlobe from "~icons/lucide/globe"
import IconLucideCheck from "~icons/lucide/check"
import IconLucideServer from "~icons/lucide/server"
import IconLucideTrash from "~icons/lucide/trash"
import IconLucideTrash2 from "~icons/lucide/trash-2"
import IconLucideAlertCircle from "~icons/lucide/alert-circle"
import IconLucideArrowRight from "~icons/lucide/arrow-right"
import IconLucidePlus from "~icons/lucide/plus"
import IconLucidePackage from "~icons/lucide/package"

const t = useI18n()
const instanceService = useService(InstanceSwitcherService)

const emit = defineEmits(["close-dropdown"])

const userEmail = computed(() => platform.auth.getProbableUser()?.email || "")
const showAddModal = ref(false)
const newInstanceUrl = ref("")
const isClearingCache = ref(false)

const state = useReadonlyStream(
  instanceService.getStateStream(),
  instanceService.getCurrentState().value
)

const recentInstances = useReadonlyStream(
  instanceService.getRecentInstancesStream(),
  []
)

const currentInstance = computed<InstanceType | null>(() => {
  return state.value.status === "connected" ? state.value.instance : null
})

const isConnecting = computed(() => state.value.status === "connecting")

const connectionError = computed(() => {
  return state.value.status === "error" ? state.value.message : null
})

const isVendored = computed(() => {
  return currentInstance.value?.type === "vendored"
})

const isValidUrl = computed(() => {
  if (!newInstanceUrl.value) return false

  try {
    new URL(
      newInstanceUrl.value.startsWith("http")
        ? newInstanceUrl.value
        : `http://${newInstanceUrl.value}`
    )
    return true
  } catch {
    return false
  }
})

const isCurrentUrl = computed(() => {
  if (!newInstanceUrl.value) return false
  if (currentInstance.value?.type !== "server") return false

  try {
    return instanceService.isCurrentlyConnectedTo(newInstanceUrl.value)
  } catch {
    return false
  }
})

const isConnectedTo = (url: string): boolean => {
  return instanceService.isCurrentlyConnectedTo(url)
}

const connectToVendored = async () => {
  if (isVendored.value) return
  await instanceService.connectToVendoredInstance()
  if (showAddModal.value) showAddModal.value = false
  emit("close-dropdown")
}

const connectToServer = async (url: string) => {
  await instanceService.connectToServerInstance(url)
  emit("close-dropdown")
}

const removeInstance = async (url: string) => {
  await instanceService.removeInstance(url)
}

const handleConnect = async () => {
  if (!newInstanceUrl.value || !isValidUrl.value || isCurrentUrl.value) return

  const success = await instanceService.connectToServerInstance(
    newInstanceUrl.value
  )

  if (success) {
    newInstanceUrl.value = ""
    showAddModal.value = false
  }
}

const handleClearCache = async () => {
  if (isClearingCache.value) return

  isClearingCache.value = true
  await instanceService.clearCache()
  isClearingCache.value = false
}
</script>
