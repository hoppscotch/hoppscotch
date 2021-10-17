<template>
  <div class="border border-divider rounded flex flex-col flex-1">
    <div
      class="flex flex-1 items-start"
      :class="{
        'cursor-pointer hover:bg-primaryDark transition hover:border-dividerDark focus-visible:border-dividerDark':
          compact && team.myRole === 'OWNER',
      }"
      @click="compact && team.myRole === 'OWNER' ? $emit('invite-team') : ''"
    >
      <div class="p-4">
        <label
          class="font-semibold text-secondaryDark"
          :class="{ 'cursor-pointer': compact && team.myRole === 'OWNER' }"
        >
          {{ team.name || $t("state.nothing_found") }}
        </label>
        <div class="flex -space-x-1 mt-2 overflow-hidden">
          <img
            v-for="(member, index) in team.members"
            :key="`member-${index}`"
            v-tippy="{ theme: 'tooltip' }"
            :title="member.user.displayName"
            :src="member.user.photoURL || undefined"
            :alt="member.user.displayName"
            class="rounded-full h-5 ring-primary ring-2 w-5 inline-block"
          />
        </div>
      </div>
    </div>
    <div v-if="!compact" class="flex flex-shrink-0 items-end justify-between">
      <span>
        <ButtonSecondary
          v-if="team.myRole === 'OWNER'"
          svg="edit"
          class="rounded-none"
          :label="$t('action.edit').toString()"
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
          :label="$t('team.invite')"
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
              :title="$t('action.more')"
              svg="more-vertical"
            />
          </template>
          <SmartItem
            v-if="team.myRole === 'OWNER'"
            svg="edit"
            :label="$t('action.edit').toString()"
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
            :label="$t('action.delete').toString()"
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
            :label="$t('team.exit').toString()"
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
import { useContext } from "@nuxtjs/composition-api"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import { TeamMemberRole } from "~/helpers/backend/graphql"
import {
  deleteTeam as backendDeleteTeam,
  leaveTeam,
} from "~/helpers/backend/mutations/Team"

const props = defineProps<{
  team: {
    name: string
    myRole: TeamMemberRole
    ownersCount: number
    members: Array<{
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

const {
  app: { i18n },
  $toast,
} = useContext()

const t = i18n.t.bind(i18n)

const deleteTeam = () => {
  if (!confirm(t("confirm.remove_team").toString())) return

  pipe(
    backendDeleteTeam(props.teamID),
    TE.match(
      (err) => {
        // TODO: Better errors ? We know the possible errors now
        $toast.error(t("error.something_went_wrong").toString(), {
          icon: "error_outline",
        })
        console.error(err)
      },
      () => {
        $toast.success(t("team.deleted").toString(), {
          icon: "done",
        })
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
        $toast.error(t("error.something_went_wrong").toString(), {
          icon: "error_outline",
        })
        console.error(err)
      },
      () => {
        $toast.success(t("team.left").toString(), {
          icon: "done",
        })
      }
    )
  )() // Tasks (and TEs) are lazy, so call the function returned
}
</script>
