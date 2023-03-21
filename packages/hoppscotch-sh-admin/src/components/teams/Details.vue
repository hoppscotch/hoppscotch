<template>
  <div class="sm:px-6 p-4" v-if="team">
    <h3 class="text-3xl font-medium text-zinc-800 dark:text-gray-200">
      Team Details
    </h3>

    <div class="mt-5">
      <div class="grid gap-4">
        <div class="w-full">
          <div
            class="p-4 bg-zinc-200 dark:bg-zinc-800 rounded-md shadow-sm flex flex-col gap-1"
          >
            <div class="flex mb-6">
              <icon-lucide-user class="text-emerald-400 text-3xl" />

              <h4
                class="text-3xl ml-2 font-semibold text-gray-700 dark:text-gray-200"
              >
                Team Info
              </h4>
            </div>
            <div class="flex text-xl">
              <h4 class="font-semibold text-gray-700 dark:text-gray-400">
                Team ID:
              </h4>
              <div class="text-gray-600 dark:text-gray-200 ml-2">
                {{ team.id }}
              </div>
            </div>
            <div class="flex text-xl items-center">
              <h4 class="font-semibold text-gray-700 dark:text-gray-400">
                Team Name:
              </h4>
              <div class="text-gray-600 dark:text-gray-200 ml-2">
                <div v-if="showRenameInput" class="flex gap-4 items-center">
                  <input
                    class="w-full py-1 px-3 dark:bg-zinc-800 border-gray-200 dark:border-gray-600 rounded-md focus:border-emerald-600 focus:ring focus:ring-opacity-40 focus:ring-emerald-500 border"
                    type="text"
                    v-model="teamName"
                    placeholder="Team Name"
                    autofocus
                    v-focus
                  />

                  <div>
                    <HoppButtonPrimary
                      class="py-1"
                      filled
                      label="Rename"
                      @click="renameTeamName()"
                    />
                  </div>
                </div>

                <div v-else class="flex gap-2">
                  <span>
                    {{ teamName }}
                  </span>
                  <icon-lucide-edit
                    class="cursor-pointer"
                    @click="showRenameInput = true"
                  />
                </div>
              </div>
            </div>

            <div class="flex text-xl">
              <h4 class="font-semibold text-gray-700 dark:text-gray-400">
                Number of members:
              </h4>
              <div class="text-gray-600 dark:text-gray-200 ml-2">
                {{ team.teamMembers.length }}
              </div>
            </div>

            <div class="flex justify-start mt-6">
              <HoppButtonSecondary
                class="mr-4"
                filled
                label="Delete"
                @click="team && deleteTeam(team.id)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="my-6">
      <div class="flex flex-col mb-6">
        <div class="flex items-center justify-between flex-1 pt-4 mb-4">
          <label for="memberList"> Members </label>
          <div class="flex">
            <HoppButtonSecondary
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
            <img
              :src="`/images/states/dark/add_group.svg`"
              loading="lazy"
              class="inline-flex flex-col object-contain object-center w-16 h-16 my-4"
            />
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
                            updateMemberRole(
                              member.userID,
                              TeamMemberRole.Owner
                            );
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

      <HoppButtonPrimary
        label="Save"
        :loading="isLoading"
        outline
        @click="saveTeam"
      />
    </div>

    <TeamsPendingInvites :editingTeamID="team.id" />
    <HoppSmartConfirmModal
      :show="confirmDeletion"
      :title="`Confirm Deletion of ${team.name} team?`"
      @hide-modal="confirmDeletion = false"
      @resolve="deleteTeamMutation(deleteTeamUID)"
    />
    <TeamsInvite
      :show="showInvite"
      :editingTeamID="team.id"
      @hide-modal="
        () => {
          showInvite = false;
        }
      "
    />
  </div>
</template>

<script setup lang="ts">
import IconCircleDot from '~icons/lucide/circle-dot';
import IconCircle from '~icons/lucide/circle';
import IconUserPlus from '~icons/lucide/user-plus';
import IconUserMinus from '~icons/lucide/user-minus';
import IconHelpCircle from '~icons/lucide/help-circle';
import { useClientHandle, useMutation } from '@urql/vue';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from '../../composables/toast';
import {
  RemoveTeamDocument,
  RenameTeamDocument,
  TeamInfoDocument,
  TeamMemberRole,
  UpdateTeamMemberRoleDocument,
  RemoveTeamMemberDocument,
  TeamInfoQuery,
} from '../../helpers/backend/graphql';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const team = ref<TeamInfoQuery['team'] | null>(null);
const showRenameInput = ref(false);
const showInvite = ref(false);
const teamName = ref('');

const { client } = useClientHandle();
const fetching = ref(true);

const teamDeletion = useMutation(RemoveTeamDocument);
const teamRename = useMutation(RenameTeamDocument);
const confirmDeletion = ref(false);
const deleteTeamUID = ref<string | null>(null);

onMounted(async () => {
  await getTeamInfo();
});

const getTeamInfo = async () => {
  fetching.value = true;
  const result = await client
    .query(TeamInfoDocument, { uid: route.params.id.toString() })
    .toPromise();

  if (result.error) {
    return toast.error('Unable to Load Team Info..');
  }

  if (result.data?.team) {
    team.value = result.data.team;
    teamName.value = team.value.name;
  }

  fetching.value = false;
};

const renameTeamName = async () => {
  if (!team.value) return;

  if (team.value.name === teamName.value) {
    showRenameInput.value = false;
    return;
  }

  const variables = { uid: team.value.id, name: teamName.value };
  await teamRename.executeMutation(variables).then((result) => {
    if (result.error) {
      toast.error('Renaming team Failed');
    } else {
      showRenameInput.value = false;
      toast.success('Team Renamed Successfully');
    }
  });
};

const deleteTeam = (id: string) => {
  confirmDeletion.value = true;
  deleteTeamUID.value = id;
};

const deleteTeamMutation = async (id: string | null) => {
  if (!id) {
    confirmDeletion.value = false;
    toast.error('User Deletion Failed');
    return;
  }
  const variables = { uid: id };
  await teamDeletion.executeMutation(variables).then((result) => {
    if (result.error) {
      toast.error('User Deletion Failed');
    } else {
      toast.success('User Deleted Successfully');
    }
  });
  confirmDeletion.value = false;
  deleteTeamUID.value = null;
  router.push('/teams');
};

const emit = defineEmits<{
  (e: 'refetch-teams'): void;
  (e: 'invite-team'): void;
}>();

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
      (update) => members.findIndex((y) => y.user.uid === update.userID) !== -1
    );
  }
);

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

const isLoadingIndex = ref<null | number>(null);

const removeExistingTeamMember = async (userID: string, index: number) => {
  if (!team.value) return;
  isLoadingIndex.value = index;
  const removeTeamMemberResult = await removeTeamMember(
    userID,
    team.value.id
  )();
  if (removeTeamMemberResult.error) {
    toast.error(`Something went wrong`);
  } else {
    toast.success(`Member removed successfully`);
    emit('refetch-teams');
    getTeamInfo();
  }
  isLoadingIndex.value = null;
};

const isLoading = ref(false);

const saveTeam = async () => {
  isLoading.value = true;
  roleUpdates.value.forEach(async (update) => {
    if (!team.value) return;
    const updateMemberRoleResult = await updateTeamMemberRole(
      update.userID,
      team.value.id,
      update.role
    );
    if (updateMemberRoleResult.error) {
      toast.error(`Something went wrong`);
    } else {
      toast.success(`Roles updated successfully`);
    }
    isLoading.value = false;
  });
};

const updateTeamMemberRoleMutation = useMutation(UpdateTeamMemberRoleDocument);
const updateTeamMemberRole = (
  userUid: string,
  teamID: string,
  newRole: TeamMemberRole
) => {
  return updateTeamMemberRoleMutation.executeMutation({
    userUid,
    teamID,
    newRole,
  });
};

const removeTeamMemberMutation = useMutation(RemoveTeamMemberDocument);
const removeTeamMember = (userUid: string, teamID: string) => {
  return () =>
    removeTeamMemberMutation.executeMutation({
      userUid,
      teamID,
    });
};
</script>
