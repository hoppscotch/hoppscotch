<template>
  <div class="flex items-center -space-x-1">
    <div
      v-for="(member, index) in slicedTeamMembers"
      :key="`member-${index}`"
      class="inline-flex"
    >
      <HoppSmartPicture
        v-if="member.user.photoURL"
        v-tippy="{ theme: 'tooltip' }"
        :url="member.user.photoURL"
        :title="getUserName(member)"
        :alt="getUserName(member)"
        class="ring-primary ring-2"
        @click="handleClick()"
      />
      <HoppSmartPicture
        v-else
        v-tippy="{ theme: 'tooltip' }"
        :title="getUserName(member)"
        :initial="getUserName(member)"
        class="ring-primary ring-2"
        @click="handleClick()"
      />
    </div>
    <button
      v-if="props.showCount && props.teamMembers.length > maxMembersSoftLimit"
      v-tippy="{ theme: 'tooltip', allowHTML: true }"
      :title="remainingSlicedMembers"
      class="z-10 inline-flex items-center justify-center w-5 h-5 rounded-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primaryDark font- text-8px text-secondaryDark bg-dividerDark ring-2 ring-primary"
      tabindex="0"
      @click="handleClick()"
    >
      {{
        teamMembers.length > 0
          ? `+${teamMembers.length - maxMembersSoftLimit}`
          : ""
      }}
    </button>
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

const emit = defineEmits<{
  (e: "handle-click"): void
}>()

const getUserName = (member: TeamMember): string =>
  member.user.displayName ||
  member.user.email ||
  t("profile.default_hopp_displayName")

const maxMembersSoftLimit = 4
const maxMembersHardLimit = 6

const slicedTeamMembers = computed(() => {
  if (props.showCount && props.teamMembers.length > maxMembersSoftLimit) {
    return props.teamMembers.slice(0, maxMembersSoftLimit)
  } else {
    return props.teamMembers
  }
})

const remainingSlicedMembers = computed(
  () =>
    props.teamMembers
      .slice(maxMembersSoftLimit)
      .slice(0, maxMembersHardLimit)
      .map((member) => getUserName(member))
      .join(`,<br>`) +
    (props.teamMembers.length - (maxMembersSoftLimit + maxMembersHardLimit) > 0
      ? `,<br>${t("team.more_members", {
          count:
            props.teamMembers.length -
            (maxMembersSoftLimit + maxMembersHardLimit),
        })}`
      : ``)
)

const handleClick = () => {
  emit("handle-click")
}
</script>
