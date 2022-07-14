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
          @keyup.delete="deleteAction.$el.click()"
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
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import { useI18n, useToast } from "~/helpers/utils/composables"
import {
  deleteTeamEnvironment,
  createDuplicateEnvironment as duplicateEnvironment,
} from "~/helpers/backend/mutations/TeamEnvironment"
import { GQLError } from "~/helpers/backend/GQLClient"
import { TeamEnvironment } from "~/helpers/teams/TeamEnvironment"

const t = useI18n()
const toast = useToast()

const props = defineProps<{
  environment: TeamEnvironment
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
  pipe(
    deleteTeamEnvironment(props.environment.id),
    TE.match(
      (err: GQLError<string>) => {
        console.error(err)
        toast.error(`${getErrorMessage(err)}`)
      },
      () => {
        toast.success(`${t("team_environment.deleted")}`)
      }
    )
  )()
}

const duplicateEnvironments = () => {
  pipe(
    duplicateEnvironment(props.environment.id),
    TE.match(
      (err: GQLError<string>) => {
        console.error(err)
        toast.error(`${getErrorMessage(err)}`)
      },
      () => {
        toast.success(`${t("team_environment.duplicate")}`)
      }
    )
  )()
}

const getErrorMessage = (err: GQLError<string>) => {
  if (err.type === "network_error") {
    return t("error.network_error")
  } else {
    switch (err.error) {
      case "team_environment/not_found":
        return t("team_environment.not_found")
      default:
        return t("error.something_went_wrong")
    }
  }
}
</script>
