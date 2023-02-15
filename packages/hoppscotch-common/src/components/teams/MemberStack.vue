<template>
  <div class="flex -space-x-1 items-center">
    <div
      v-for="(member, index) in slicedTeamMembers"
      :key="`member-${index}`"
      v-tippy="{ theme: 'tooltip' }"
      :title="
        member.user.displayName ||
        member.user.email ||
        t('profile.default_hopp_displayName')
      "
      class="inline-flex"
    >
      <ProfilePicture
        v-if="member.user.photoURL"
        :url="member.user.photoURL"
        :alt="member.user.displayName || t('profile.default_hopp_displayName')"
        class="ring-primary ring-2"
      />
      <ProfilePicture
        v-else
        :initial="member.user.displayName || member.user.email"
        class="ring-primary ring-2"
      />
    </div>
    <div
      v-if="props.showCount && props.teamMembers.length > maxMembers"
      v-tippy="{ theme: 'tooltip' }"
      :title="
        t('team.more_members', { count: props.teamMembers.length - maxMembers })
      "
      class="inline-flex"
    >
      <span
        class="z-10 flex items-center justify-center w-5 h-5 rounded-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primaryDark font- text-8px text-secondaryDark bg-dividerDark ring-2 ring-primary"
        tabindex="0"
      >
        {{
          teamMembers.length > 0 ? `+${teamMembers.length - maxMembers}` : ""
        }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { GetMyTeamsQuery } from "~/helpers/backend/graphql"
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
</script>
