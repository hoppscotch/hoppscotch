<template>
  <div class="flex flex-col w-full">
    <div v-if="!showAddInstanceModal" class="flex flex-col w-full">
      <div
        v-if="currentInstance"
        class="flex items-center justify-between p-4 hover:bg-primaryLight"
      >
        <div class="flex items-center gap-2">
          <IconLucideServer class="text-secondary" />
          <span class="font-semibold">{{
            getInstanceDisplayName(currentInstance.url)
          }}</span>
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
        class="flex items-center justify-between p-4 hover:bg-primaryLight cursor-pointer"
        @click="loadVendoredInstance()"
      >
        <div class="flex items-center gap-2">
          <IconLucidePackage class="text-secondary" />
          <div class="flex flex-col">
            <span class="font-semibold">Hoppscotch</span>
            <span class="text-xs text-secondary">Vendored app</span>
          </div>
        </div>
        <IconLucideArrowRight class="text-secondary" />
      </div>

      <div class="flex flex-col">
        <div
          v-for="instance in recentInstances"
          :key="instance.url"
          class="flex items-center justify-between p-4 hover:bg-primaryLight"
          :class="{ 'opacity-50': isCurrentInstance(instance.url) }"
        >
          <div
            class="flex items-center gap-2 flex-1 cursor-pointer"
            @click="
              !isCurrentInstance(instance.url) && connectToUrl(instance.url)
            "
          >
            <IconLucideServer class="text-secondary" />
            <div class="flex flex-col">
              <span class="font-semibold">{{
                getInstanceDisplayName(instance.url)
              }}</span>
              <span v-if="instance.version" class="text-xs text-secondary"
                >v{{ instance.version }}</span
              >
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
              @click.stop="() => removeInstance(instance.url)"
            />
            <IconLucideArrowRight
              v-if="!isCurrentInstance(instance.url)"
              class="text-secondary"
            />
          </div>
        </div>
      </div>

      <div
        class="flex items-center gap-2 p-4 hover:bg-primaryLight cursor-pointer border-t border-divider"
        @click="showAddInstanceModal = true"
      >
        <IconLucidePlus class="text-secondary" />
        <span class="text-secondary">Add an instance</span>
      </div>
    </div>
  </div>

  <HoppSmartModal
    v-if="showAddInstanceModal"
    dialog
    :title="t('instances.add_new') || 'Add New Instance'"
    styles="sm:max-w-md"
    @close="showAddInstanceModal = false"
  >
    <template #body>
      <form class="flex flex-col space-y-4" @submit.prevent="handleConnect">
        <div class="flex flex-col space-y-2">
          <HoppSmartInput
            v-model="instanceUrl"
            :disabled="isLoading"
            placeholder="localhost"
            :error="!!error"
            type="url"
            autofocus
            styles="bg-primaryLight border-divider text-secondaryDark"
            input-styles="floating-input peer w-full px-4 py-2 bg-primaryDark border border-divider rounded text-secondaryDark font-medium transition focus:border-dividerDark disabled:opacity-75"
            @submit="handleConnect"
          >
            <template #prefix>
              <IconLucideGlobe class="text-secondary" />
            </template>
            <template
              v-if="
                !isLoading && !error && instanceUrl && !isSameAsCurrentInstance
              "
              #suffix
            >
              <IconLucideCheck class="text-green-500" />
            </template>
            <template
              v-if="!isLoading && !error && isSameAsCurrentInstance"
              #suffix
            >
              <IconLucideAlertCircle class="text-amber-500" />
            </template>
          </HoppSmartInput>
          <span v-if="error" class="text-red-500 text-tiny">{{ error }}</span>
          <span
            v-else-if="isSameAsCurrentInstance"
            class="text-amber-500 text-tiny"
          >
            {{
              t("instances.already_connected") ||
              "You are already connected to this instance"
            }}
          </span>
        </div>

        <HoppButtonPrimary
          type="submit"
          :disabled="isLoading || isSameAsCurrentInstance"
          :loading="isLoading"
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
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue"
import { useService } from "dioc/vue"
import { useI18n } from "@composables/i18n"
import { Subscription } from "rxjs"
import {
  InstanceDetails,
  InstanceSwitcherService,
} from "~/services/instance-switcher.service"
import { platform } from "~/platform"
import { load } from "@hoppscotch/plugin-appload"

import IconLucideGlobe from "~icons/lucide/globe"
import IconLucideCheck from "~icons/lucide/check"
import IconLucideServer from "~icons/lucide/server"
import IconLucideTrash from "~icons/lucide/trash"
import IconLucideTrash2 from "~icons/lucide/trash-2"
import IconLucideAlertCircle from "~icons/lucide/alert-circle"
import IconLucideArrowRight from "~icons/lucide/arrow-right"
import IconLucidePlus from "~icons/lucide/plus"
import IconLucidePackage from "~icons/lucide/package"

const instanceSwitcherService = useService(InstanceSwitcherService)
const t = useI18n()

const showAddInstanceModal = ref(false)
const instanceUrl = ref("")
const isClearingCache = ref(false)
const isLoadingVendored = ref(false)
const storedInstances = ref<InstanceDetails[]>([])
let subscription: Subscription | null = null

const error = computed(() => instanceSwitcherService.getConnectionError().value)
const isLoading = computed(
  () => instanceSwitcherService.getConnectingState().value
)
const recentInstances = computed(() => {
  return storedInstances.value.filter((instance) =>
    currentInstance.value
      ? !instanceSwitcherService.isCurrentInstance(instance.url)
      : true
  )
})
const currentInstance = computed(
  () => instanceSwitcherService.getCurrentInstance().value
)
const userEmail = computed(() => platform.auth.getProbableUser()?.email || "")

const isSameAsCurrentInstance = computed(() => {
  return instanceUrl.value ? isCurrentInstance(instanceUrl.value) : false
})

const isCurrentInstance = (url: string): boolean => {
  return instanceSwitcherService.isCurrentInstance(url)
}

const getInstanceDisplayName = (url: string): string => {
  try {
    const urlObj = new URL(url)
    if (urlObj.hostname === "localhost") {
      return "Self Hosted"
    }
    if (urlObj.hostname === "hoppscotch") {
      return "Cloud"
    }
    return urlObj.hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

const removeInstance = async (url: string) => {
  const instances = storedInstances.value.filter((item) => item.url !== url)
  storedInstances.value = instances
  await instanceSwitcherService.removeInstance(url)
}

const handleClearCache = async () => {
  if (isClearingCache.value) return

  isClearingCache.value = true
  try {
    await instanceSwitcherService.clearCache()
  } finally {
    isClearingCache.value = false
  }
}

const loadVendoredInstance = async () => {
  if (isLoadingVendored.value) return

  isLoadingVendored.value = true
  try {
    const loadResp = await load({
      bundleName: "Hoppscotch",
      window: { title: "Hoppscotch" },
    })

    if (loadResp.success) {
      instanceSwitcherService.setCurrentVendoredInstance()
    }
  } catch (e) {
    console.error("Failed to load vendored instance:", e)
  } finally {
    isLoadingVendored.value = false
  }
}

const connectToUrl = async (url: string) => {
  if (isLoading.value) return
  if (isCurrentInstance(url)) return

  try {
    await instanceSwitcherService.connectToInstance(url)
  } catch (e) {}
}

const handleConnect = () => {
  if (!instanceUrl.value || isSameAsCurrentInstance.value) return
  connectToUrl(instanceUrl.value).then(() => {
    if (!error.value) {
      showAddInstanceModal.value = false
    }
  })
}

watch(instanceUrl, (newUrl) => {
  if (isCurrentInstance(newUrl)) {
    instanceSwitcherService.clearConnectionError()
  }
})

onMounted(() => {
  subscription = instanceSwitcherService
    .getInstanceEventsStream()
    .subscribe((event: any) => {
      if (event.event === "instance-connection-success") {
        instanceUrl.value = ""
        showAddInstanceModal.value = false
      }
    })

  const instancesSubscription = instanceSwitcherService
    .getRecentInstancesStream()
    .subscribe((instances) => {
      storedInstances.value = instances
    })

  storedInstances.value = instanceSwitcherService.getRecentInstances()

  if (subscription) {
    const originalUnsubscribe = subscription.unsubscribe.bind(subscription)
    subscription.unsubscribe = () => {
      originalUnsubscribe()
      instancesSubscription.unsubscribe()
    }
  }
})

onUnmounted(() => {
  if (subscription) {
    subscription.unsubscribe()
  }
})
</script>
