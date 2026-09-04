<script setup lang="ts">
import { getDefaultGRPCRequest } from "@hoppscotch/data"
import { usePageHead } from "@composables/head"
import { useService } from "dioc/vue"
import { computed, ref } from "vue"
import { supportsGRPC } from "~/helpers/grpc"
import { useI18n } from "~/composables/i18n"
import { KernelInterceptorService } from "~/services/kernel-interceptor.service"
import { GRPCTabService } from "~/services/tab/grpc"

const t = useI18n()
const tabs = useService(GRPCTabService)
const interceptorService = useService(KernelInterceptorService)
const activeTabs = tabs.getActiveTabs()
const currentTabID = computed(() => tabs.currentTabID.value)
const confirmingCloseForTabID = ref<string | null>(null)
const grpcAvailable = computed(() =>
  interceptorService.available.value.some((interceptor) =>
    supportsGRPC(interceptor.capabilities)
  )
)

usePageHead({ title: computed(() => t("navigation.grpc")) })

const addNewTab = () => {
  tabs.createNewTab({
    request: getDefaultGRPCRequest(),
    isDirty: false,
    optionTabPreference: "body",
  })
}
const removeTab = (tabID: string) => {
  const tab = tabs.getTabRef(tabID).value
  if (tab.document.isDirty) confirmingCloseForTabID.value = tabID
  else tabs.closeTab(tabID)
}
const confirmClose = () => {
  if (confirmingCloseForTabID.value)
    tabs.closeTab(confirmingCloseForTabID.value)
  confirmingCloseForTabID.value = null
}
</script>

<template>
  <div class="flex min-w-0 flex-1">
    <AppPaneLayout layout-id="grpc">
      <template #primary>
        <HoppSmartPlaceholder
          v-if="!grpcAvailable"
          :heading="t('grpc.unsupported_title')"
          :text="t('grpc.unsupported_description')"
        />
        <HoppSmartWindows
          v-else-if="currentTabID"
          id="grpc_windows"
          :model-value="currentTabID"
          @update:model-value="tabs.setActiveTab"
          @remove-tab="removeTab"
          @add-tab="addNewTab"
          @sort="tabs.updateTabOrdering($event.oldIndex, $event.newIndex)"
        >
          <HoppSmartWindow
            v-for="tab in activeTabs"
            :id="tab.id"
            :key="tab.id"
            :label="tab.document.request.name"
            :is-removable="activeTabs.length > 1"
            close-visibility="hover"
          >
            <template #suffix>
              <span v-if="tab.document.isDirty" class="text-secondary">●</span>
            </template>
            <GrpcRequestTab
              :model-value="tab"
              @update:model-value="tabs.updateTab"
            />
          </HoppSmartWindow>
        </HoppSmartWindows>
      </template>
    </AppPaneLayout>
    <HoppSmartConfirmModal
      :show="confirmingCloseForTabID !== null"
      :confirm="t('modal.close_unsaved_tab')"
      :title="t('confirm.close_unsaved_tab')"
      @hide-modal="confirmingCloseForTabID = null"
      @resolve="confirmClose"
    />
  </div>
</template>
