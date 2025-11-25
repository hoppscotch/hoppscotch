<template>
  <div class="flex flex-col space-y-1 w-full">
    <div
      class="flex items-center justify-between px-4 py-3 hover:accent-primaryLight rounded-md"
      :class="{
        'cursor-pointer': !isVendored,
        'bg-accent text-accentContrast': isVendored,
      }"
      @click="!isVendored && connectToVendored()"
    >
      <div class="flex items-center gap-4">
        <IconLucidePackage />
        <div class="flex flex-col">
          <span class="font-semibold uppercase">{{
            platform.instance.displayConfig.displayName
          }}</span>
          <div class="flex items-center gap-1">
            <!-- NOTE:
                 If this is set to `platform.instance.displayConfig.description`
                 it'll be bound to app's perspective, i.e.
                 when in vendored cloud app, it'll show `Cloud`
                 and in vendored self-hosted app, it'll show `On-Prem`
                 even tho both are actually pointing to the same bundle.
                 Essentially switching instance is a **perspective shift**
                 for the underlying desktop app launcher.

                 The best way to solve this would be to make instance information
                 into "links" to the bundles hosted by the `appload` plugin,
                 which is already underway in HFE-829.

                 This is a workaround for the time being. See `Header.vue`
                 for code that maintains backwards compatibility.
            -->
            <span class="text-xs">Default</span>
            <span class="text-xs"> app </span>
          </div>
        </div>
      </div>
      <IconLucideCheck v-if="isVendored" />
    </div>

    <div class="flex flex-col space-y-1">
      <div
        v-for="instance in recentInstances"
        :key="instance.serverUrl"
        class="flex items-center justify-between px-4 py-2 rounded-md group"
        :class="{
          'bg-accent text-accentContrast':
            currentInstance &&
            currentInstance.type === 'server' &&
            currentInstance.serverUrl ===
              instanceService.normalizeUrl(instance.serverUrl),
          'hover:bg-primaryLight': !(
            currentInstance &&
            currentInstance.type === 'server' &&
            currentInstance.serverUrl ===
              instanceService.normalizeUrl(instance.serverUrl)
          ),
        }"
      >
        <div
          class="flex items-center gap-4 flex-1 cursor-pointer"
          @click="
            !isConnectedTo(instance.serverUrl) &&
            connectToServer(instance.serverUrl)
          "
        >
          <IconLucideServer />
          <div class="flex flex-col">
            <span
              v-tippy="{
                content: instance.serverUrl,
                theme: 'tooltip',
              }"
              class="font-semibold uppercase"
              >{{ getHostname(instance.displayName) }}</span
            >
            <div class="flex items-center gap-1">
              <span v-if="isOnPrem(instance.serverUrl)" class="text-xs"
                >On-prem</span
              >
              <span v-if="instance.version" class="text-xs">
                v{{ instance.version }}
              </span>
            </div>
          </div>
        </div>
        <div class="flex items-center">
          <div class="w-8 flex justify-center">
            <IconLucideCheck
              v-if="isConnectedTo(instance.serverUrl)"
              class="text-current"
            />
            <HoppButtonSecondary
              v-if="!isConnectedTo(instance.serverUrl)"
              v-tippy="{
                content: t('action.remove_instance') || 'Remove instance',
                theme: 'tooltip',
              }"
              class="!p-0 ml-4 opacity-0 group-hover:opacity-100 transition-opacity"
              :icon="IconLucideTrash"
              @click.stop="
                confirmRemove(instance.serverUrl, instance.displayName)
              "
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
      @click="
        () => {
          showAddModal = true
          $emit('close-dropdown')
        }
      "
    />

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
    <HoppSmartModal
      v-if="showRemoveModal"
      dialog
      :title="t('instances.confirm_remove') || 'Confirm Removal'"
      styles="sm:max-w-md"
      @close="showRemoveModal = false"
    >
      <template #body>
        <p>
          {{
            t("instances.remove_warning") ||
            "Are you sure you want to remove this instance?"
          }}

          <span class="font-bold">
            {{ confirmedRemoveDisplayName }}
          </span>
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end w-full space-x-2">
          <HoppButtonSecondary
            :label="t('action.cancel') || 'Cancel'"
            outline
            filled
            @click="showRemoveModal = false"
          />
          <HoppButtonPrimary
            :label="t('action.remove') || 'Remove'"
            filled
            outline
            @click="removeInstance(confirmedRemoveUrl)"
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
import {
  InstanceSwitcherService,
  InstanceType,
} from "~/services/instance-switcher.service"
import { platform } from "~/platform"

import IconLucideGlobe from "~icons/lucide/globe"
import IconLucideCheck from "~icons/lucide/check"
import IconLucideServer from "~icons/lucide/server"
import IconLucideTrash from "~icons/lucide/trash"
import IconLucideTrash2 from "~icons/lucide/trash-2"
import IconLucideAlertCircle from "~icons/lucide/alert-circle"
import IconLucidePlus from "~icons/lucide/plus"
import IconLucidePackage from "~icons/lucide/package"

const t = useI18n()
const instanceService = useService(InstanceSwitcherService)

const emit = defineEmits(["close-dropdown"])

const showAddModal = ref(false)
const newInstanceUrl = ref("")
const isClearingCache = ref(false)
const showRemoveModal = ref(false)
const confirmedRemoveUrl = ref("")
const confirmedRemoveDisplayName = ref("")

const confirmRemove = (url: string, displayName: string) => {
  confirmedRemoveUrl.value = url
  confirmedRemoveDisplayName.value = displayName || getHostname(url)
  showRemoveModal.value = true
  emit("close-dropdown")
}

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
  return currentInstance.value?.type === platform.instance.instanceType
})

const isValidUrl = computed(() => {
  if (!newInstanceUrl.value) return false

  try {
    const normalizedUrl = newInstanceUrl.value.startsWith("http")
      ? newInstanceUrl.value
      : `http://${newInstanceUrl.value}`
    const url = new URL(normalizedUrl)
    console.info("url", url)
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

const getHostname = (url: string): string => {
  try {
    if (!url.startsWith("http")) {
      return url.toUpperCase()
    }
    const hostname = new URL(url).hostname
    return hostname.toUpperCase()
  } catch {
    return url.toUpperCase()
  }
}

const isOnPrem = (url: string): boolean => {
  try {
    const hostname = new URL(url.startsWith("http") ? url : `http://${url}`)
      .hostname
    return hostname !== "hoppscotch.com"
  } catch {
    return false
  }
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
  showRemoveModal.value = false
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
