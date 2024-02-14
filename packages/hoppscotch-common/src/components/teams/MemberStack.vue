<template>
  <div class="flex items-center -space-x-1">
    <div
      v-for="(member, index) in slicedTeamMembers"
      :key="`member-${index}`"
      class="inline-flex group cursor-pointer"
    >
      <HoppSmartPicture
        v-tippy="{ theme: 'tooltip' }"
        :name="member.user.uid"
        :title="getUserName(member as TeamMember)"
        class="ring-2 ring-primary group-hover:-translate-y-1 transition-transform"
        @click="handleClick()"
      />
    </div>
    <button
      v-if="props.showCount && props.teamMembers.length > maxMembersSoftLimit"
      v-tippy="{ theme: 'tooltip', allowHTML: true }"
      :title="remainingSlicedMembers"
      class="text-[8px] z-10 inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-dividerDark text-secondaryDark ring-2 ring-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primaryDark"
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
  t("profile.default_hopp_displayname")

const maxMembersSoftLimit = 3
const maxMembersHardLimit = 6

const slicedTeamMembers = computed(() => {
  if (props.showCount && props.teamMembers.length > maxMembersSoftLimit) {
    return props.teamMembers.slice(0, maxMembersSoftLimit)
  }
  return props.teamMembers
})

const remainingSlicedMembers = computed(
  () =>
    props.teamMembers
      .slice(maxMembersSoftLimit)
      .slice(0, maxMembersHardLimit)
      .map((member) => getUserName(member as TeamMember))
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
