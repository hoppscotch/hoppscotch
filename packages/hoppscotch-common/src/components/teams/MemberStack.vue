<template>
  <div class="flex -space-x-1 items-center">
    <div
      v-for="(member, index) in slicedTeamMembers"
      :key="`member-${index}`"
      class="inline-flex"
    >
      <ProfilePicture
        v-if="member.user.photoURL"
        v-tippy="{ theme: 'tooltip' }"
        :url="member.user.photoURL"
        :title="getUserName(member)"
        :alt="getUserName(member)"
        class="ring-primary ring-2"
      />
      <ProfilePicture
        v-else
        v-tippy="{ theme: 'tooltip' }"
        :title="getUserName(member)"
        :initial="getUserName(member)"
        class="ring-primary ring-2"
      />
    </div>
    <span
      v-if="props.showCount && props.teamMembers.length > maxMembers"
      v-tippy="{ theme: 'tooltip', allowHTML: true }"
      :title="remainingSlicedMembers"
      class="z-10 inline-flex items-center justify-center w-5 h-5 rounded-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primaryDark font- text-8px text-secondaryDark bg-dividerDark ring-2 ring-primary"
      tabindex="0"
    >
      {{ teamMembers.length > 0 ? `+${teamMembers.length - maxMembers}` : "" }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { GetMyTeamsQuery, TeamMember } from "~/helpers/backend/graphql"
import { useI18n } from "@composables/i18n"
import { computed } from "vue"

const t = useI18n()

const props = defineProps<{
  teamMembers: GetMyTeamsQuery["myTeams"][number]["teamMembers"]
  showCount?: boolean
}>()

const maxMembers = 4

const slicedTeamMembers = computed(() => {
  if (props.showCount && props.teamMembers.length > maxMembers) {
    return props.teamMembers.slice(0, maxMembers)
  } else {
    return props.teamMembers
  }
})

const getUserName = (member: TeamMember): string =>
  member.user.displayName ||
  member.user.email ||
  t("profile.default_hopp_displayName")

const remainingSlicedMembers = computed(() =>
  props.teamMembers
    .slice(maxMembers)
    .map((member) => getUserName(member))
    .join(",<br>")
)
</script>
