<template>
  <!-- Use custom component if platform provides one, otherwise fallback to default impl below -->
  <component
    :is="platform.instance.customInstanceSwitcherComponent"
    v-if="platform.instance?.customInstanceSwitcherComponent"
    @close-dropdown="$emit('close-dropdown')"
  />

  <!-- Default impl -->
  <div
    v-else-if="isInstanceSwitchingEnabled"
    class="flex flex-col space-y-1 w-full"
  >
    <div
      v-if="connectedInstance"
      class="flex items-center justify-between px-4 py-3 bg-accent text-accentContrast rounded-md"
    >
      <div class="flex items-center gap-4">
        <IconLucideServer />
        <div class="flex flex-col">
          <span class="font-semibold uppercase">{{
            connectedInstance.displayName
          }}</span>
          <div class="flex items-center gap-1">
            <span class="text-xs">{{ connectedInstance.kind }}</span>
            <span
              v-if="showVersionInfo && connectedInstance.version"
              class="text-xs"
            >
              v{{ connectedInstance.version }}
            </span>
          </div>
        </div>
      </div>
      <IconLucideCheck />
    </div>

    <div class="flex flex-col space-y-1">
      <div
        v-for="instance in recentInstances"
        :key="instance.serverUrl"
        class="flex items-center justify-between px-4 py-2 rounded-md group hover:bg-primaryLight cursor-pointer"
        @click="
          handleConnectToInstance(
            instance.serverUrl,
            instance.kind,
            instance.displayName
          )
        "
      >
        <div class="flex items-center gap-4 flex-1">
          <IconLucideServer />
          <div class="flex flex-col">
            <span
              v-tippy="{
                content: instance.serverUrl,
                theme: 'tooltip',
              }"
              class="font-semibold uppercase"
            >
              {{ instance.displayName }}
            </span>
            <div class="flex items-center gap-1">
              <span class="text-xs">{{ instance.kind }}</span>
              <span v-if="showVersionInfo && instance.version" class="text-xs">
                v{{ instance.version }}
              </span>
            </div>
          </div>
        </div>
        <div class="flex items-center">
          <div class="w-8 flex justify-center">
            <HoppButtonSecondary
              v-if="allowInstanceRemoval && instance.kind !== 'vendored'"
              v-tippy="{
                content: t('action.remove_instance') || 'Remove instance',
                theme: 'tooltip',
              }"
              class="!p-0 ml-4 opacity-0 group-hover:opacity-100 transition-opacity"
              :icon="IconLucideTrash"
              @click.stop="confirmRemove(instance)"
            />
            <IconLucideLock
              v-else-if="instance.kind === 'vendored'"
              v-tippy="{
                content: 'Built-in instance cannot be removed',
                theme: 'tooltip',
              }"
              class="!p-0 ml-4 opacity-50 text-secondaryLight"
            />
          </div>
        </div>
      </div>
    </div>

    <hr />

    <HoppButtonSecondary
      :label="t('instances.add_instance') || 'Add an instance'"
      :icon="IconLucidePlus"
      filled
      outline
      @click="openAddModal"
    />

    <HoppSmartModal
      v-if="showAddModal"
      dialog
      :title="t('instances.add_new') || 'Add New Instance'"
      styles="sm:max-w-md"
      @close="closeAddModal"
    >
      <template #body>
        <form class="flex flex-col space-y-4" @submit.prevent="handleConnect">
          <div class="flex flex-col space-y-2">
            <HoppSmartInput
              v-model="newInstanceUrl"
              :disabled="isConnecting"
              placeholder="hoppscotch.company.com"
              :error="!!connectionError"
              type="text"
              autofocus
              styles="bg-primaryLight border-divider text-secondaryDark"
              input-styles="floating-input peer w-full px-4 py-2 bg-primaryDark border border-divider rounded text-secondaryDark font-medium transition focus:border-dividerDark disabled:opacity-75"
              @submit="handleConnect"
            >
              <template #prefix>
                <IconLucideGlobe />
              </template>
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
                  v-else-if="!isConnecting && !connectionError && isCurrentUrl"
                  class="text-amber-500"
                />
              </template>
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
        <div v-if="allowCacheClear" class="flex justify-end w-full">
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

    <HoppSmartModal
      v-if="showRemoveModal"
      dialog
      :title="t('instances.confirm_remove') || 'Confirm Removal'"
      styles="sm:max-w-md"
      @close="closeRemoveModal"
    >
      <template #body>
        <p>
          {{
            t("instances.remove_warning") ||
            "Are you sure you want to remove this instance?"
          }}
          <span class="font-bold">{{ instanceToRemove?.displayName }}</span>
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end w-full space-x-2">
          <HoppButtonSecondary
            :label="t('action.cancel') || 'Cancel'"
            outline
            filled
            @click="closeRemoveModal"
          />
          <HoppButtonPrimary
            :label="t('action.remove') || 'Remove'"
            filled
            outline
            @click="handleRemoveInstance"
          />
        </div>
      </template>
    </HoppSmartModal>
  </div>

  <!-- Fallback when instance switching is disabled -->
  <div v-else class="flex items-center justify-center px-4 py-3">
    <span class="text-secondaryLight text-sm"
      >Instance switching not available</span
    >
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue"
import { Subscription } from "rxjs"

import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"

import { platform } from "~/platform"
import type {
  ConnectionState,
  Instance,
  InstanceKind,
} from "~/platform/instance"

import IconLucideGlobe from "~icons/lucide/globe"
import IconLucideCheck from "~icons/lucide/check"
import IconLucideServer from "~icons/lucide/server"
import IconLucideTrash from "~icons/lucide/trash"
import IconLucideTrash2 from "~icons/lucide/trash-2"
import IconLucideAlertCircle from "~icons/lucide/alert-circle"
import IconLucidePlus from "~icons/lucide/plus"

const t = useI18n()
const toast = useToast()

const emit = defineEmits<{
  "close-dropdown": []
}>()

const showVersionInfo = ref(true)
const allowInstanceRemoval = ref(true)
const allowCacheClear = ref(true)

const showAddModal = ref(false)
const showRemoveModal = ref(false)

const newInstanceUrl = ref("")
const isConnecting = ref(false)
const connectionError = ref("")
const isClearingCache = ref(false)

const instanceToRemove = ref<Instance | null>(null)

const connectionState = ref<ConnectionState>({ status: "idle" })
const recentInstancesList = ref<Instance[]>([])
const currentInstance = ref<Instance | null>(null)

let connectionStateSubscription: Subscription | null = null
let recentInstancesSubscription: Subscription | null = null
let currentInstanceSubscription: Subscription | null = null

const isInstanceSwitchingEnabled = computed(() => {
  return platform.instance?.instanceSwitchingEnabled ?? false
})

const connectedInstance = computed(() => {
  return isConnectedState(connectionState.value) ? currentInstance.value : null
})

const recentInstances = computed(() => {
  return recentInstancesList.value.filter(
    (instance) => instance.serverUrl !== currentInstance.value?.serverUrl
  )
})

const isValidUrl = computed(() => {
  if (!newInstanceUrl.value) return false

  if (platform.instance?.normalizeUrl) {
    return platform.instance.normalizeUrl(newInstanceUrl.value) !== null
  }

  try {
    const urlToTest = newInstanceUrl.value.startsWith("http")
      ? newInstanceUrl.value
      : `https://${newInstanceUrl.value}`
    new URL(urlToTest)
    return true
  } catch {
    return false
  }
})

const isCurrentUrl = computed(() => {
  if (!newInstanceUrl.value || !currentInstance.value) return false

  const normalizedNew =
    platform.instance?.normalizeUrl?.(newInstanceUrl.value) ||
    newInstanceUrl.value
  const normalizedCurrent =
    platform.instance?.normalizeUrl?.(currentInstance.value.serverUrl) ||
    currentInstance.value.serverUrl

  return normalizedNew === normalizedCurrent
})

const isConnectedState = (
  state: ConnectionState
): state is Extract<ConnectionState, { status: "connected" }> => {
  return state.status === "connected"
}

const isErrorState = (
  state: ConnectionState
): state is Extract<ConnectionState, { status: "error" }> => {
  return state.status === "error"
}

const openAddModal = () => {
  showAddModal.value = true
  emit("close-dropdown")
  // NOTE: Just for debugging
  // toast.info(t("instances.opening_add_modal") || "Opening add instance dialog")
}

const closeAddModal = () => {
  showAddModal.value = false
  newInstanceUrl.value = ""
  connectionError.value = ""
  // NOTE: Just for debugging
  // toast.info(t("instances.closed_add_modal") || "Add instance dialog closed")
}

const closeRemoveModal = () => {
  showRemoveModal.value = false
  instanceToRemove.value = null
  // NOTE: Just for debugging
  // toast.info(t("instances.cancelled_removal") || "Instance removal cancelled")
}

const validateConnectionSupport = (): boolean => {
  if (!platform.instance?.connectToInstance) {
    toast.error("Instance connection not supported")
    return false
  }
  return true
}

const executeBeforeConnectHook = async (
  serverUrl: string,
  instanceKind: InstanceKind,
  displayName?: string
): Promise<boolean> => {
  if (!platform.instance?.beforeConnect) return true

  try {
    const result = await platform.instance.beforeConnect(
      serverUrl,
      instanceKind,
      displayName
    )

    if (!result) {
      toast.info(
        t("instances.connection_cancelled") ||
          "Connection cancelled by pre-connect validation"
      )
    }

    return result
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Pre-connect validation failed"
    toast.error(errorMessage)
    return false
  }
}

const executeAfterConnectHook = async (): Promise<void> => {
  if (platform.instance?.afterConnect && currentInstance.value) {
    try {
      await platform.instance.afterConnect(currentInstance.value)
      toast.success(
        t("instances.post_connect_completed") ||
          "Post-connection setup completed"
      )
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Post-connection setup failed"
      toast.info(errorMessage)
    }
  }
}

const handleConnectionSuccess = async (message: string): Promise<void> => {
  toast.success(message || "Connected successfully")
  emit("close-dropdown")
  await executeAfterConnectHook()
}

const handleConnectionError = (message: string, serverUrl: string): void => {
  connectionError.value = message || "Connection failed"
  toast.error(message || "Connection failed")

  if (platform.instance?.onConnectionError) {
    platform.instance.onConnectionError(message, serverUrl)
  }
}

const performConnection = async (
  serverUrl: string,
  instanceKind: InstanceKind,
  displayName?: string
): Promise<void> => {
  if (!platform.instance?.connectToInstance) return

  toast.info(
    t("instances.connecting") || `Connecting to ${displayName || serverUrl}...`
  )

  const result = await platform.instance.connectToInstance(
    serverUrl,
    instanceKind,
    displayName
  )

  if (result.success) {
    await handleConnectionSuccess(result.message)
  } else {
    handleConnectionError(result.message, serverUrl)
  }
}

const handleConnectToInstance = async (
  serverUrl: string,
  instanceKind: InstanceKind = "on-prem",
  displayName?: string
) => {
  if (!validateConnectionSupport()) return

  isConnecting.value = true
  connectionError.value = ""

  try {
    const shouldConnect = await executeBeforeConnectHook(
      serverUrl,
      instanceKind,
      displayName
    )
    if (!shouldConnect) return

    await performConnection(serverUrl, instanceKind, displayName)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred"
    handleConnectionError(errorMessage, serverUrl)
  } finally {
    isConnecting.value = false
  }
}

const handleConnect = async () => {
  if (!newInstanceUrl.value || !isValidUrl.value || isCurrentUrl.value) return

  const instanceKind: InstanceKind = "on-prem"

  await handleConnectToInstance(
    newInstanceUrl.value,
    instanceKind,
    newInstanceUrl.value
  )

  if (!connectionError.value) {
    closeAddModal()
  }
}

const confirmRemove = (instance: Instance) => {
  instanceToRemove.value = instance
  showRemoveModal.value = true
  toast.info(
    t("instances.confirm_removal") ||
      `Confirm removal of ${instance.displayName}`
  )
}

const validateRemovalSupport = (): boolean => {
  if (!platform.instance?.removeInstance) {
    toast.error("Instance removal not supported")
    return false
  }
  return true
}

const executeBeforeRemoveHook = async (
  instance: Instance
): Promise<boolean> => {
  if (!platform.instance?.beforeRemove) return true

  try {
    const result = await platform.instance.beforeRemove(instance)

    if (!result) {
      toast.info(
        t("instances.removal_cancelled") ||
          "Instance removal cancelled by pre-removal validation"
      )
    }

    return result
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Pre-removal validation failed"
    toast.error(errorMessage)
    return false
  }
}

const executeAfterRemoveHook = async (instance: Instance): Promise<void> => {
  if (platform.instance?.afterRemove) {
    try {
      await platform.instance.afterRemove(instance)
      toast.success(
        t("instances.post_remove_completed") || "Post-removal cleanup completed"
      )
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Post-removal cleanup failed"
      toast.info(errorMessage)
    }
  }
}

const handleRemovalSuccess = async (
  message: string,
  instance: Instance
): Promise<void> => {
  toast.success(message || "Instance removed successfully")
  await executeAfterRemoveHook(instance)
}

const handleRemovalError = (message: string, instance: Instance): void => {
  toast.error(message || "Failed to remove instance")

  if (platform.instance?.onRemoveError) {
    platform.instance.onRemoveError(message, instance)
  }
}

const performRemoval = async (instance: Instance): Promise<void> => {
  if (!platform.instance?.removeInstance) return

  toast.info(t("instances.removing") || `Removing ${instance.displayName}...`)

  const result = await platform.instance.removeInstance(instance)

  if (result.success) {
    await handleRemovalSuccess(result.message, instance)
  } else {
    handleRemovalError(result.message, instance)
  }
}

const handleRemoveInstance = async () => {
  if (!instanceToRemove.value || !validateRemovalSupport()) return

  const instance = instanceToRemove.value

  try {
    const shouldRemove = await executeBeforeRemoveHook(instance)
    if (!shouldRemove) {
      closeRemoveModal()
      return
    }

    await performRemoval(instance)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred"
    handleRemovalError(errorMessage, instance)
  } finally {
    closeRemoveModal()
  }
}

const validateCacheClearSupport = (): boolean => {
  if (!platform.instance?.clearCache) {
    toast.error("Cache clearing not supported")
    return false
  }
  return true
}

const performCacheClear = async (): Promise<void> => {
  if (!platform.instance?.clearCache) return

  toast.info(t("instances.clearing_cache") || "Clearing cache...")

  const result = await platform.instance.clearCache()

  if (result.success) {
    toast.success(result.message || "Cache cleared successfully")
  } else {
    toast.error(result.message || "Failed to clear cache")
  }
}

const handleClearCache = async () => {
  if (!validateCacheClearSupport()) return

  isClearingCache.value = true

  try {
    await performCacheClear()
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred"
    toast.error(errorMessage)
  } finally {
    isClearingCache.value = false
  }
}

const initializeSynchronousState = (): void => {
  if (!platform.instance) return

  if (platform.instance.getCurrentConnectionState) {
    connectionState.value = platform.instance.getCurrentConnectionState()
  }

  if (platform.instance.getRecentInstances) {
    recentInstancesList.value = platform.instance.getRecentInstances()
  }

  if (platform.instance.getCurrentInstance) {
    currentInstance.value = platform.instance.getCurrentInstance()
  }

  // NOTE: Just for debugging
  // toast.info(t("instances.initialized") || "Instance switcher initialized")
}

const handleConnectionStateChange = (state: ConnectionState): void => {
  const previousState = connectionState.value.status
  connectionState.value = state

  if (isErrorState(state)) {
    connectionError.value = state.message
    if (previousState !== "error") {
      toast.error(state.message || "Connection error occurred")
    }
  } else if (state.status === "connecting") {
    connectionError.value = ""
    isConnecting.value = true
    if (previousState !== "connecting") {
      toast.info(
        t("instances.connecting_state") || "Establishing connection..."
      )
    }
  } else if (state.status === "connected") {
    isConnecting.value = false
    if (previousState !== "connected") {
      toast.success(
        t("instances.connected_state") || "Successfully connected to instance"
      )
    }
  } else if (state.status === "idle") {
    isConnecting.value = false
    if (previousState === "connected") {
      toast.info(
        t("instances.disconnected_state") || "Disconnected from instance"
      )
    }
  }
}

const subscribeToConnectionState = (): void => {
  if (!platform.instance?.getConnectionStateStream) return

  connectionStateSubscription = platform.instance
    .getConnectionStateStream()
    .subscribe({
      next: handleConnectionStateChange,
      error: (error) => {
        console.error("Connection state stream error:", error)
        toast.error(
          t("instances.stream_error") || "Connection state monitoring failed"
        )
        connectionState.value = {
          status: "error",
          target: "stream",
          message: error.message,
        }
      },
    })
}

const subscribeToRecentInstances = (): void => {
  if (!platform.instance?.getRecentInstancesStream) return

  recentInstancesSubscription = platform.instance
    .getRecentInstancesStream()
    .subscribe({
      next: (instances) => {
        recentInstancesList.value = instances
      },
      error: (error) => {
        console.error("Recent instances stream error:", error)
        toast.error(
          t("instances.recent_instances_error") ||
            "Failed to load recent instances"
        )
      },
    })
}

const subscribeToCurrentInstance = (): void => {
  if (!platform.instance?.getCurrentInstanceStream) return

  currentInstanceSubscription = platform.instance
    .getCurrentInstanceStream()
    .subscribe({
      next: (instance) => {
        const previousInstance = currentInstance.value
        currentInstance.value = instance

        if (
          instance &&
          (!previousInstance ||
            previousInstance.serverUrl !== instance.serverUrl)
        ) {
          toast.success(
            t("instances.instance_changed") ||
              `Switched to ${instance.displayName}`
          )
        }
      },
      error: (error) => {
        console.error("Current instance stream error:", error)
        toast.error(
          t("instances.current_instance_error") ||
            "Failed to track current instance"
        )
      },
    })
}

const initializeStreams = () => {
  if (!platform.instance) {
    toast.info(
      t("instances.not_available") || "Instance switching is not available"
    )
    return
  }

  initializeSynchronousState()
  subscribeToConnectionState()
  subscribeToRecentInstances()
  subscribeToCurrentInstance()
}

const cleanup = () => {
  connectionStateSubscription?.unsubscribe()
  recentInstancesSubscription?.unsubscribe()
  currentInstanceSubscription?.unsubscribe()

  toast.info(
    t("instances.cleanup_completed") || "Instance switcher cleanup completed"
  )
}

watch(newInstanceUrl, () => {
  connectionError.value = ""
})

onMounted(() => {
  initializeStreams()
})

onUnmounted(() => {
  cleanup()
})
</script>
