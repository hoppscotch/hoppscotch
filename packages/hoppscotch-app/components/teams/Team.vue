<template>
  <div class="flex flex-col flex-1 border rounded border-divider">
    <div
      class="flex items-start flex-1"
      :class="
        compact
          ? team.myRole === 'OWNER'
            ? 'cursor-pointer hover:bg-primaryDark transition hover:border-dividerDark focus-visible:border-dividerDark'
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
      <div class="p-4">
        <label
          class="font-semibold text-secondaryDark"
          :class="{ 'cursor-pointer': compact && team.myRole === 'OWNER' }"
        >
          {{ team.name || t("state.nothing_found") }}
        </label>
        <div class="flex mt-2 overflow-hidden -space-x-1">
          <img
            v-for="(member, index) in team.teamMembers"
            :key="`member-${index}`"
            v-tippy="{ theme: 'tooltip' }"
            :title="member.user.displayName"
            :src="member.user.photoURL || undefined"
            :alt="member.user.displayName"
            class="inline-block w-5 h-5 rounded-full ring-primary ring-2"
            loading="lazy"
          />
        </div>
      </div>
    </div>
    <div v-if="!compact" class="flex items-end justify-between flex-shrink-0">
      <span>
        <ButtonSecondary
          v-if="team.myRole === 'OWNER'"
          svg="edit"
          class="rounded-none"
          :label="t('action.edit')"
          @click.native="
            () => {
              $emit('edit-team')
            }
          "
        />
        <ButtonSecondary
          v-if="team.myRole === 'OWNER'"
          svg="user-plus"
          class="rounded-none"
          :label="t('team.invite')"
          @click.native="
            () => {
              emit('invite-team')
            }
          "
        />
      </span>
      <span>
        <tippy ref="options" interactive trigger="click" theme="popover" arrow>
          <template #trigger>
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('action.more')"
              svg="more-vertical"
            />
          </template>
          <SmartItem
            v-if="team.myRole === 'OWNER'"
            svg="edit"
            :label="t('action.edit')"
            @click.native="
              () => {
                $emit('edit-team')
                $refs.options.tippy().hide()
              }
            "
          />
          <SmartItem
            v-if="team.myRole === 'OWNER'"
            svg="trash-2"
            color="red"
            :label="t('action.delete')"
            @click.native="
              () => {
                deleteTeam()
                $refs.options.tippy().hide()
              }
            "
          />
          <SmartItem
            v-if="!(team.myRole === 'OWNER' && team.ownersCount == 1)"
            svg="trash"
            :label="t('team.exit')"
            @click.native="
              () => {
                exitTeam()
                $refs.options.tippy().hide()
              }
            "
          />
        </tippy>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import { TeamMemberRole } from "~/helpers/backend/graphql"
import {
  deleteTeam as backendDeleteTeam,
  leaveTeam,
} from "~/helpers/backend/mutations/Team"
import { useI18n, useToast } from "~/helpers/utils/composables"

const t = useI18n()

const props = defineProps<{
  team: {
    name: string
    myRole: TeamMemberRole
    ownersCount: number
    teamMembers: Array<{
      user: {
        displayName: string
        photoURL: string | null
      }
    }>
  }
  teamID: string
  compact: boolean
}>()

const emit = defineEmits<{
  (e: "edit-team"): void
}>()

const toast = useToast()

const deleteTeam = () => {
  if (!confirm(`${t("confirm.remove_team")}`)) return

  pipe(
    backendDeleteTeam(props.teamID),
    TE.match(
      (err) => {
        // TODO: Better errors ? We know the possible errors now
        toast.error(`${t("error.something_went_wrong")}`)
        console.error(err)
      },
      () => {
        toast.success(`${t("team.deleted")}`)
      }
    )
  )() // Tasks (and TEs) are lazy, so call the function returned
}

const exitTeam = () => {
  if (!confirm("Are you sure you want to exit this team?")) return

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
</script>
