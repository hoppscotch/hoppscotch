<template>
  <div class="my-6">
    <h3 class="text-2xl font-bold text-gray-200">Team Members</h3>
    <div class="flex flex-col mb-6">
      <div class="flex items-center justify-end flex-1 pt-4 mb-4">
        <div class="flex">
          <HoppButtonPrimary
            :icon="IconUserPlus"
            label="Add Members"
            filled
            @click="showInvite = !showInvite"
          />
        </div>
      </div>

      <div class="border rounded border-divider">
        <div
          v-if="team?.teamMembers?.length === 0"
          class="flex flex-col items-center justify-center p-4 text-secondaryLight"
        >
          <span class="pb-4 text-center">
            No members in this team. Add members to this team to collaborate
          </span>
          <HoppButtonSecondary
            :icon="IconUserPlus"
            label="Add Members"
            @click="
              () => {
                showInvite = !showInvite;
              }
            "
          />
        </div>
        <div v-else class="divide-y divide-dividerLight">
          <div
            v-for="(member, index) in membersList"
            :key="`member-${index}`"
            class="flex divide-x divide-dividerLight"
          >
            <input
              class="flex flex-1 px-4 py-2 bg-transparent"
              placeholder="Email"
              :name="'param' + index"
              :value="member.email"
              readonly
            />
            <span>
              <tippy
                interactive
                trigger="click"
                theme="popover"
                :on-shown="() => tippyActions![index].focus()"
              >
                <span class="select-wrapper">
                  <input
                    class="flex flex-1 px-4 py-2 bg-transparent cursor-pointer"
                    placeholder="Permissions"
                    :name="'value' + index"
                    :value="member.role"
                    readonly
                  />
                </span>
                <template #content="{ hide }">
                  <div
                    ref="tippyActions"
                    class="flex flex-col focus:outline-none"
                    tabindex="0"
                    @keyup.escape="hide()"
                  >
                    <HoppSmartItem
                      label="OWNER"
                      :icon="
                        member.role === 'OWNER' ? IconCircleDot : IconCircle
                      "
                      :active="member.role === 'OWNER'"
                      @click="
                        () => {
                          updateMemberRole(member.userID, TeamMemberRole.Owner);
                          hide();
                        }
                      "
                    />
                    <HoppSmartItem
                      label="EDITOR"
                      :icon="
                        member.role === 'EDITOR' ? IconCircleDot : IconCircle
                      "
                      :active="member.role === 'EDITOR'"
                      @click="
                        () => {
                          updateMemberRole(
                            member.userID,
                            TeamMemberRole.Editor
                          );
                          hide();
                        }
                      "
                    />
                    <HoppSmartItem
                      label="VIEWER"
                      :icon="
                        member.role === 'VIEWER' ? IconCircleDot : IconCircle
                      "
                      :active="member.role === 'VIEWER'"
                      @click="
                        () => {
                          updateMemberRole(
                            member.userID,
                            TeamMemberRole.Viewer
                          );
                          hide();
                        }
                      "
                    />
                  </div>
                </template>
              </tippy>
            </span>
            <div class="flex">
              <HoppButtonSecondary
                id="member"
                v-tippy="{ theme: 'tooltip' }"
                title="Remove"
                :icon="IconUserMinus"
                color="red"
                :loading="isLoadingIndex === index"
                @click="removeExistingTeamMember(member.userID, index)"
              />
            </div>
          </div>
        </div>
      </div>
      <div v-if="!fetching && !team" class="flex flex-col items-center">
        <component :is="IconHelpCircle" class="mb-4 svg-icons" />
        Something went wrong. Please try again later.
      </div>
    </div>

    <HoppButtonPrimary label="Save" outline @click="saveUpdatedTeam" />
  </div>
  <TeamsInvite
    :show="showInvite"
    :editingTeamID="route.params.id.toString()"
    @member="updateMembers"
    @hide-modal="
      () => {
        showInvite = false;
      }
    "
  />
</template>

<script setup lang="ts">
import IconCircleDot from '~icons/lucide/circle-dot';
import IconCircle from '~icons/lucide/circle';
import IconUserPlus from '~icons/lucide/user-plus';
import IconUserMinus from '~icons/lucide/user-minus';
import IconHelpCircle from '~icons/lucide/help-circle';
import { useClientHandle, useMutation } from '@urql/vue';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from '../../composables/toast';
import {
  ChangeUserRoleInTeamByAdminDocument,
  TeamInfoDocument,
  TeamMemberRole,
  RemoveUserFromTeamByAdminDocument,
  TeamInfoQuery,
} from '../../helpers/backend/graphql';
import { HoppButtonPrimary, HoppButtonSecondary } from '@hoppscotch/ui';

const toast = useToast();

// Used to Invoke the Invite Members Modal
const showInvite = ref(false);

// Get Team Details
const team = ref<TeamInfoQuery['admin']['teamInfo'] | undefined>();
const fetching = ref(true);
const route = useRoute();
const { client } = useClientHandle();

const getTeamInfo = async () => {
  fetching.value = true;
  const result = await client
    .query(TeamInfoDocument, { teamID: route.params.id.toString() })
    .toPromise();

  if (result.error) {
    return toast.error('Unable to Load Team Info..');
  }
  if (result.data?.admin.teamInfo) {
    team.value = result.data.admin.teamInfo;
  }
  fetching.value = false;
};

const emit = defineEmits<{
  (e: 'update-team'): void;
}>();

onMounted(async () => await getTeamInfo());
onUnmounted(() => emit('update-team'));

// Update members tab after a change in the members list or member roles
const updateMembers = () => getTeamInfo();

// Template refs
const tippyActions = ref<any | null>(null);

const roleUpdates = ref<
  {
    userID: string;
    role: TeamMemberRole;
  }[]
>([]);

watch(
  () => team.value,
  (teamDetails) => {
    const members = teamDetails?.teamMembers ?? [];

    // Remove deleted members
    roleUpdates.value = roleUpdates.value.filter(
      (update) =>
        members.findIndex(
          (y: { user: { uid: string } }) => y.user.uid === update.userID
        ) !== -1
    );
  }
);

// Update the role of the member selected in the UI
const updateMemberRole = (userID: string, role: TeamMemberRole) => {
  const updateIndex = roleUpdates.value.findIndex(
    (item) => item.userID === userID
  );
  if (updateIndex !== -1) {
    // Role Update exists
    roleUpdates.value[updateIndex].role = role;
  } else {
    // Role Update does not exist
    roleUpdates.value.push({
      userID,
      role,
    });
  }
};

// Obtain the list of members in the team
const membersList = computed(() => {
  if (!team.value) return [];
  const members = (team.value.teamMembers ?? []).map((member) => {
    const updatedRole = roleUpdates.value.find(
      (update) => update.userID === member.user.uid
    );

    return {
      userID: member.user.uid,
      email: member.user.email!,
      role: updatedRole?.role ?? member.role,
    };
  });

  return members;
});

// Change the role of the selected user in the team
const changeUserRoleInTeamMutation = useMutation(
  ChangeUserRoleInTeamByAdminDocument
);
const changeUserRoleInTeam = (
  userUID: string,
  teamID: string,
  newRole: TeamMemberRole
) => {
  return changeUserRoleInTeamMutation.executeMutation({
    userUID,
    teamID,
    newRole,
  });
};

// Save the updates done to the team
const isLoading = ref(false);

const saveUpdatedTeam = async () => {
  isLoading.value = true;
  roleUpdates.value.forEach(async (update) => {
    if (!team.value) return;
    const updateMemberRoleResult = await changeUserRoleInTeam(
      update.userID,
      team.value.id,
      update.role
    );
    if (updateMemberRoleResult.error) {
      toast.error('Role updation has failed!!');
    } else {
      toast.success('Roles updated successfully!!');
    }
    isLoading.value = false;
  });
};

// Remove user from the team mutation
const removeUserFromTeamMutation = useMutation(
  RemoveUserFromTeamByAdminDocument
);
const removeUserFromTeam = (userUid: string, teamID: string) => {
  return () =>
    removeUserFromTeamMutation.executeMutation({
      userUid,
      teamID,
    });
};

// Remove a team member from the team
const isLoadingIndex = ref<null | number>(null);

const removeExistingTeamMember = async (userID: string, index: number) => {
  if (!team.value) return;
  isLoadingIndex.value = index;
  const removeTeamMemberResult = await removeUserFromTeam(
    userID,
    team.value.id
  )();
  if (removeTeamMemberResult.error) {
    toast.error(`Member couldn't be removed!!`);
  } else {
    team.value.teamMembers = team.value.teamMembers?.filter(
      (member: any) => member.user.uid !== userID
    );
    toast.success('Member removed successfully!!');
  }
  isLoadingIndex.value = null;
};
</script>
