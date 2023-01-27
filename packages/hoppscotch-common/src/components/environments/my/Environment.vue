<template>
  <div
    class="flex items-stretch group"
    @contextmenu.prevent="options!.tippy.show()"
  >
    <span
      v-if="environmentIndex === 'Global'"
      class="flex items-center justify-center px-4 cursor-pointer"
      @click="emit('edit-environment')"
    >
      <icon-lucide-globe class="svg-icons" />
    </span>
    <span
      v-else
      class="flex items-center justify-center px-4 cursor-pointer"
      @click="emit('edit-environment')"
    >
      <icon-lucide-layers class="svg-icons" />
    </span>
    <span
      class="flex flex-1 min-w-0 py-2 pr-2 cursor-pointer transition group-hover:text-secondaryDark"
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
        <ButtonSecondary
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
            @keyup.delete="
              !(environmentIndex === 'Global')
                ? deleteAction!.$el.click()
                : null
            "
            @keyup.escape="hide()"
          >
            <SmartItem
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
            <SmartItem
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
            <SmartItem
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
    <SmartConfirmModal
      :show="confirmRemove"
      :title="`${t('confirm.remove_environment')}`"
      @hide-modal="confirmRemove = false"
      @resolve="removeEnvironment"
    />
  </div>
</template>

<script setup lang="ts">
import IconMoreVertical from "~icons/lucide/more-vertical"
import IconEdit from "~icons/lucide/edit"
import IconCopy from "~icons/lucide/copy"
import IconTrash2 from "~icons/lucide/trash-2"
import { ref } from "vue"
import { Environment } from "@hoppscotch/data"
import { cloneDeep } from "lodash-es"
import {
  deleteEnvironment,
  duplicateEnvironment,
  createEnvironment,
  setEnvironmentVariables,
  getGlobalVariables,
  environmentsStore,
} from "~/newstore/environments"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { TippyComponent } from "vue-tippy"
import SmartItem from "@hoppscotch/ui/src/components/smart/Item.vue"

const t = useI18n()
const toast = useToast()

const props = defineProps<{
  environment: Environment
  environmentIndex: number | "Global" | null
}>()

const emit = defineEmits<{
  (e: "edit-environment"): void
}>()

const confirmRemove = ref(false)

const tippyActions = ref<TippyComponent | null>(null)
const options = ref<TippyComponent | null>(null)
const edit = ref<typeof SmartItem>()
const duplicate = ref<typeof SmartItem>()
const deleteAction = ref<typeof SmartItem>()

const removeEnvironment = () => {
  if (props.environmentIndex === null) return
  if (props.environmentIndex !== "Global")
    deleteEnvironment(props.environmentIndex)
  toast.success(`${t("state.deleted")}`)
}

const duplicateEnvironments = () => {
  if (props.environmentIndex === null) return
  if (props.environmentIndex === "Global") {
    createEnvironment(`Global - ${t("action.duplicate")}`)
    setEnvironmentVariables(
      environmentsStore.value.environments.length - 1,
      cloneDeep(getGlobalVariables())
    )
  } else duplicateEnvironment(props.environmentIndex)
}
</script>
