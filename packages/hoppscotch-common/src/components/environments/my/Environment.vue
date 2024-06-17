<template>
  <div
    class="group flex items-stretch"
    @contextmenu.prevent="options!.tippy.show()"
  >
    <span
      v-if="environmentIndex === 'Global'"
      class="flex cursor-pointer items-center justify-center px-4"
      @click="emit('edit-environment')"
    >
      <icon-lucide-globe class="svg-icons" />
    </span>
    <span
      v-else
      class="flex cursor-pointer items-center justify-center px-4"
      @click="emit('edit-environment')"
    >
      <icon-lucide-layers class="svg-icons" />
    </span>
    <span
      class="flex min-w-0 flex-1 cursor-pointer py-2 pr-2 transition group-hover:text-secondaryDark"
      @click="emit('edit-environment')"
    >
      <span class="truncate">
        {{ environment.name }}
      </span>
    </span>
    <span>
      <tippy
        ref="options"
        interactive
        trigger="click"
        theme="popover"
        :on-shown="() => tippyActions!.focus()"
      >
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.more')"
          :icon="IconMoreVertical"
        />
        <template #content="{ hide }">
          <div
            ref="tippyActions"
            class="flex flex-col focus:outline-none"
            tabindex="0"
            role="menu"
            @keyup.e="edit!.$el.click()"
            @keyup.d="duplicate!.$el.click()"
            @keyup.j="exportAsJsonEl!.$el.click()"
            @keyup.delete="
              !(environmentIndex === 'Global')
                ? deleteAction!.$el.click()
                : null
            "
            @keyup.escape="hide()"
          >
            <HoppSmartItem
              ref="edit"
              :icon="IconEdit"
              :label="`${t('action.edit')}`"
              :shortcut="['E']"
              @click="
                () => {
                  emit('edit-environment')
                  hide()
                }
              "
            />
            <HoppSmartItem
              ref="duplicate"
              :icon="IconCopy"
              :label="`${t('action.duplicate')}`"
              :shortcut="['D']"
              @click="
                () => {
                  duplicateEnvironments()
                  hide()
                }
              "
            />
            <HoppSmartItem
              ref="exportAsJsonEl"
              :icon="IconEdit"
              :label="`${t('export.as_json')}`"
              :shortcut="['J']"
              @click="
                () => {
                  exportEnvironmentAsJSON()
                  hide()
                }
              "
            />
            <HoppSmartItem
              v-if="environmentIndex !== 'Global'"
              ref="deleteAction"
              :icon="IconTrash2"
              :label="`${t('action.delete')}`"
              :shortcut="['⌫']"
              @click="
                () => {
                  confirmRemove = true
                  hide()
                }
              "
            />
          </div>
        </template>
      </tippy>
    </span>
    <HoppSmartConfirmModal
      :show="confirmRemove"
      :title="`${t('confirm.remove_environment')}`"
      @hide-modal="confirmRemove = false"
      @resolve="removeEnvironment"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { Environment } from "@hoppscotch/data"
import { HoppSmartItem } from "@hoppscotch/ui"
import { useService } from "dioc/vue"
import * as E from "fp-ts/Either"
import { cloneDeep } from "lodash-es"
import { ref } from "vue"
import { TippyComponent } from "vue-tippy"

import { exportAsJSON } from "~/helpers/import-export/export/environment"
import { createEnvironment, getGlobalVariables } from "~/newstore/environments"
import { NewWorkspaceService } from "~/services/new-workspace"
import { SecretEnvironmentService } from "~/services/secret-environment.service"
import IconCopy from "~icons/lucide/copy"
import IconEdit from "~icons/lucide/edit"
import IconMoreVertical from "~icons/lucide/more-vertical"
import IconTrash2 from "~icons/lucide/trash-2"

const t = useI18n()
const toast = useToast()

const secretEnvironmentService = useService(SecretEnvironmentService)
const workspaceService = useService(NewWorkspaceService)

const props = defineProps<{
  environment: Environment
  environmentIndex: number | "Global" | null
}>()

const emit = defineEmits<{
  (e: "edit-environment"): void
  (e: "duplicate-environment", environmentID: number): void
  (e: "delete-environment", environmentID: number): void
}>()

const activeWorkspaceHandle = workspaceService.activeWorkspaceHandle

const confirmRemove = ref(false)

const exportEnvironmentAsJSON = async () => {
  const { environment, environmentIndex } = props

  if (environmentIndex === null || environmentIndex === "Global") {
    const result = exportAsJSON(environment, environmentIndex)

    result
      ? toast.success(t("state.download_started"))
      : toast.error(t("state.download_failed"))

    return
  }

  await exportEnvironment(environmentIndex)
}

const exportEnvironment = async (environmentID: number) => {
  if (!activeWorkspaceHandle.value) {
    toast.error("error.something_went_wrong")
    return
  }

  const environmentHandleResult =
    await workspaceService.getRESTEnvironmentHandle(
      activeWorkspaceHandle.value,
      environmentID
    )

  if (E.isLeft(environmentHandleResult)) {
    // INVALID_WORKSPACE_HANDLE | ENVIRONMENT_DOES_NOT_EXIST
    return
  }

  const environmentHandle = environmentHandleResult.right

  const environmentHandleRef = environmentHandle.get()

  if (environmentHandleRef.value.type === "invalid") {
    // INVALID_WORKSPACE_HANDLE
    return
  }

  const result = await workspaceService.exportRESTEnvironment(environmentHandle)

  if (E.isLeft(result)) {
    // INVALID_ENVIRONMENT_HANDLE | ENVIRONMENT_DOES_NOT_EXIST | EXPORT_FAILED
    return toast.error(t("export.failed"))
  }
}

const tippyActions = ref<TippyComponent | null>(null)
const options = ref<TippyComponent | null>(null)
const edit = ref<typeof HoppSmartItem>()
const duplicate = ref<typeof HoppSmartItem>()
const exportAsJsonEl = ref<typeof HoppSmartItem>()
const deleteAction = ref<typeof HoppSmartItem>()

const removeEnvironment = () => {
  if (props.environmentIndex === null) {
    return
  }

  if (props.environmentIndex !== "Global") {
    emit("delete-environment", props.environmentIndex)

    secretEnvironmentService.deleteSecretEnvironment(props.environment.id)
  }
}

const duplicateEnvironments = () => {
  if (props.environmentIndex === null) {
    return
  }

  if (props.environmentIndex === "Global") {
    createEnvironment(
      `Global - ${t("action.duplicate")}`,
      cloneDeep(getGlobalVariables())
    )

    return
  }

  emit("duplicate-environment", props.environmentIndex)
}
</script>
