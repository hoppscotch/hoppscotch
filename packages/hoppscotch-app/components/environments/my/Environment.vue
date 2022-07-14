<template>
  <div
    class="flex items-stretch group"
    @contextmenu.prevent="options.tippy().show()"
  >
    <span
      class="flex items-center justify-center px-4 cursor-pointer"
      @click="emit('edit-environment')"
    >
      <SmartIcon class="svg-icons" name="layers" />
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
        arrow
        :on-shown="() => tippyActions.focus()"
      >
        <template #trigger>
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('action.more')"
            svg="more-vertical"
          />
        </template>
        <div
          ref="tippyActions"
          class="flex flex-col focus:outline-none"
          tabindex="0"
          role="menu"
          @keyup.e="edit.$el.click()"
          @keyup.d="duplicate.$el.click()"
          @keyup.delete="
            !(environmentIndex === 'Global') ? deleteAction.$el.click() : null
          "
          @keyup.escape="options.tippy().hide()"
        >
          <SmartItem
            ref="edit"
            svg="edit"
            :label="`${t('action.edit')}`"
            :shortcut="['E']"
            @click.native="
              () => {
                emit('edit-environment')
                options.tippy().hide()
              }
            "
          />
          <SmartItem
            ref="duplicate"
            svg="copy"
            :label="`${t('action.duplicate')}`"
            :shortcut="['D']"
            @click.native="
              () => {
                duplicateEnvironments()
                options.tippy().hide()
              }
            "
          />
          <SmartItem
            v-if="!(environmentIndex === 'Global')"
            ref="deleteAction"
            svg="trash-2"
            :label="`${t('action.delete')}`"
            :shortcut="['⌫']"
            @click.native="
              () => {
                confirmRemove = true
                options.tippy().hide()
              }
            "
          />
        </div>
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
import { ref } from "@nuxtjs/composition-api"
import { Environment } from "@hoppscotch/data"
import cloneDeep from "lodash/cloneDeep"
import {
  deleteEnvironment,
  duplicateEnvironment,
  createEnvironment,
  setEnvironmentVariables,
  getGlobalVariables,
  environmentsStore,
} from "~/newstore/environments"
import { useI18n, useToast } from "~/helpers/utils/composables"

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

const tippyActions = ref<any | null>(null)
const options = ref<any | null>(null)
const edit = ref<any | null>(null)
const duplicate = ref<any | null>(null)
const deleteAction = ref<any | null>(null)

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
