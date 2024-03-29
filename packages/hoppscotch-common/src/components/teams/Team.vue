<template>
  <div
    class="flex flex-1 flex-col rounded border border-divider"
    @contextmenu.prevent="!compact ? options.tippy.show() : null"
  >
    <div
      class="flex flex-1 items-start"
      :class="
        compact
          ? team.myRole === 'OWNER'
            ? 'cursor-pointer transition hover:border-dividerDark hover:bg-primaryDark focus-visible:border-dividerDark'
            : 'cursor-not-allowed bg-primaryLight'
          : ''
      "
      @click="
        compact
          ? team.myRole === 'OWNER'
            ? $emit('invite-team')
            : noPermission()
          : ''
      "
    >
      <div class="p-4 truncate">
        <label
          class="font-semibold text-secondaryDark"
          :class="{ 'cursor-pointer': compact && team.myRole === 'OWNER' }"
        >
          {{ team.name || t("state.nothing_found") }}
        </label>
        <TeamsMemberStack :team-members="team.teamMembers" class="mt-4" />
      </div>
    </div>
    <div v-if="!compact" class="flex flex-shrink-0 items-end justify-between">
      <span>
        <HoppButtonSecondary
          v-if="team.myRole === 'OWNER'"
          :icon="IconEdit"
          class="rounded-none"
          :label="t('action.edit')"
          @click="
            () => {
              $emit('edit-team')
            }
          "
        />
        <HoppButtonSecondary
          v-if="team.myRole === 'OWNER'"
          :icon="IconUserPlus"
          class="rounded-none"
          :label="t('team.invite')"
          @click="
            () => {
              emit('invite-team')
            }
          "
        />
      </span>
      <span>
        <tippy
          ref="options"
          interactive
          trigger="click"
          theme="popover"
          :on-shown="() => tippyActions.focus()"
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
              @keyup.e="team.myRole === 'OWNER' ? edit.$el.click() : null"
              @keyup.x="
                !(team.myRole === 'OWNER' && team.ownersCount == 1)
                  ? exit.$el.click()
                  : null
              "
              @keyup.delete="
                team.myRole === 'OWNER' ? deleteAction.$el.click() : null
              "
              @keyup.escape="hide()"
            >
              <HoppSmartItem
                v-if="team.myRole === 'OWNER'"
                ref="edit"
                :icon="IconEdit"
                :label="t('action.edit')"
                :shortcut="['E']"
                @click="
                  () => {
                    $emit('edit-team')
                    hide()
                  }
                "
              />
              <HoppSmartItem
                v-if="!(team.myRole === 'OWNER' && team.ownersCount == 1)"
                ref="exit"
                :icon="IconUserX"
                :label="t('team.exit')"
                :shortcut="['X']"
                @click="
                  () => {
                    confirmExit = true
                    hide()
                  }
                "
              />
              <HoppSmartItem
                v-if="team.myRole === 'OWNER'"
                ref="deleteAction"
                :icon="IconTrash2"
                :label="t('action.delete')"
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
    </div>
    <HoppSmartConfirmModal
      :show="confirmRemove"
      :title="t('confirm.remove_team')"
      :loading-state="loading"
      @hide-modal="confirmRemove = false"
      @resolve="deleteTeam()"
    />
    <HoppSmartConfirmModal
      :show="confirmExit"
      :title="t('confirm.exit_team')"
      @hide-modal="confirmExit = false"
      @resolve="exitTeam()"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import { GetMyTeamsQuery } from "~/helpers/backend/graphql"
import {
  deleteTeam as backendDeleteTeam,
  leaveTeam,
} from "~/helpers/backend/mutations/Team"

import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"

import IconEdit from "~icons/lucide/edit"
import IconMoreVertical from "~icons/lucide/more-vertical"
import IconUserX from "~icons/lucide/user-x"
import IconUserPlus from "~icons/lucide/user-plus"
import IconTrash2 from "~icons/lucide/trash-2"
import { useService } from "dioc/vue"
import { WorkspaceService } from "~/services/workspace.service"

const t = useI18n()

const props = defineProps<{
  team: GetMyTeamsQuery["myTeams"][number]
  teamID: string
  compact: boolean
}>()

const emit = defineEmits<{
  (e: "edit-team"): void
  (e: "invite-team"): void
  (e: "refetch-teams"): void
}>()

const toast = useToast()

const confirmRemove = ref(false)
const confirmExit = ref(false)

const loading = ref(false)

const workspaceService = useService(WorkspaceService)

const deleteTeam = () => {
  loading.value = true
  pipe(
    backendDeleteTeam(props.teamID),
    TE.match(
      (err) => {
        // TODO: Better errors ? We know the possible errors now
        toast.error(`${t("error.something_went_wrong")}`)
        console.error(err)
        loading.value = false
        confirmRemove.value = false
      },
      () => {
        toast.success(`${t("team.deleted")}`)
        loading.value = false
        emit("refetch-teams")

        const currentWorkspace = workspaceService.currentWorkspace.value

        // If the current workspace is the deleted workspace, change the workspace to personal
        if (
          currentWorkspace.type === "team" &&
          currentWorkspace.teamID === props.teamID
        ) {
          workspaceService.changeWorkspace({ type: "personal" })
        }

        confirmRemove.value = false
      }
    )
  )() // Tasks (and TEs) are lazy, so call the function returned
}

const exitTeam = () => {
  pipe(
    leaveTeam(props.teamID),
    TE.match(
      (err) => {
        // TODO: Better errors ?
        toast.error(`${t("error.something_went_wrong")}`)
        console.error(err)
      },
      () => {
        toast.success(`${t("team.left")}`)
      }
    )
  )() // Tasks (and TEs) are lazy, so call the function returned
}

const noPermission = () => {
  toast.error(`${t("profile.no_permission")}`)
}

// Template refs
const tippyActions = ref<any | null>(null)
const options = ref<any | null>(null)
const edit = ref<any | null>(null)
const deleteAction = ref<any | null>(null)
const exit = ref<any | null>(null)
</script>
