<template>
  <div v-if="fetching" class="flex justify-center"><HoppSmartSpinner /></div>
  <div v-if="team">
    <div class="flex">
      <button
        class="p-2 mb-2 mr-5 rounded-3xl bg-zinc-800"
        @click="router.push('/teams')"
      >
        <icon-lucide-arrow-left class="text-xl" />
      </button>
      <div class="">
        <h3 class="mx-auto text-3xl font-bold text-gray-200 mt-1">
          {{ team.name }}
        </h3>
      </div>
    </div>
    <div v-if="team" class="flex !rounded-none justify-center mb-5 sm:px-6 p-4">
      <HoppButtonSecondary
        class="!rounded-none"
        :class="{ '!bg-primaryDark': showTeamDetails }"
        filled
        outline
        label="Details"
        @click="switchToTeamDetailsTab"
      />

      <HoppButtonSecondary
        class="!rounded-none"
        :class="{ '!bg-primaryDark': showMembers }"
        filled
        outline
        label="Members"
        @click="switchToMembersTab"
      />

      <HoppButtonSecondary
        class="!rounded-none"
        :class="{ '!bg-primaryDark': showPendingInvites }"
        filled
        outline
        label="Invites"
        @click="switchToPendingInvitesTab"
      />
    </div>

    <div v-if="team && showTeamDetails">
      <h3 class="sm:px-6 px-4 text-2xl font-bold text-gray-200">
        Team Details
      </h3>

      <div class="px-6 rounded-md mt-5">
        <div class="grid gap-6">
          <div v-if="team.id">
            <label class="text-gray-200" for="username">Team ID</label>
            <div
              class="w-full p-3 mt-2 bg-zinc-800 border-gray-600 rounded-md focus:border-emerald-600 focus:ring focus:ring-opacity-40 focus:ring-emerald-500"
            >
              {{ team.id }}
            </div>
          </div>
          <div>
            <label class="text-gray-200" for="username">Team Name</label>

            <div v-if="!showRenameInput" class="flex">
              <div
                class="flex-1 w-full p-3 mt-2 bg-zinc-800 border-gray-600 rounded-md focus:border-emerald-600 focus:ring focus:ring-opacity-40 focus:ring-emerald-500"
              >
                {{ teamName }}
              </div>

              <HoppButtonPrimary
                class="cursor-pointer mt-2 ml-2"
                filled
                :icon="IconEdit"
                label="Edit"
                @click="showRenameInput = true"
              />
            </div>
            <div v-else class="flex">
              <input
                class="flex-1 w-full p-3 mt-2 bg-zinc-800 border-gray-600 rounded-md focus:border-emerald-600 focus:ring focus:ring-opacity-40 focus:ring-emerald-500"
                type="text"
                v-model="teamName"
                placeholder="Team Name"
                autofocus
                v-focus
              />
              <div>
                <HoppButtonPrimary
                  class="cursor-pointer mt-2 ml-2 min-h-11"
                  :icon="IconSave"
                  filled
                  label="Rename"
                  @click="renameTeamName()"
                />
              </div>
            </div>
          </div>
          <div v-if="team.teamMembers.length">
            <label class="text-gray-200" for="username"
              >Number of Members</label
            >
            <div
              class="w-full p-3 mt-2 bg-zinc-800 border-gray-200 border-gray-600 rounded-md focus:border-emerald-600 focus:ring focus:ring-opacity-40 focus:ring-emerald-500"
            >
              {{ team.teamMembers.length }}
            </div>
          </div>
        </div>
        <div class="flex justify-start mt-8">
          <HoppButtonSecondary
            class="mr-4 !bg-red-600 !text-gray-300 !hover:text-gray-100"
            filled
            label="Delete Team"
            @click="team && deleteTeam(team.id)"
          />
        </div>
      </div>
    </div>
  </div>

  <div v-if="team" class="sm:px-6 px-4">
    <TeamsMembers v-if="showMembers" @updateTeam="updateTeam()" />
    <TeamsPendingInvites v-if="showPendingInvites" :editingTeamID="team.id" />
    <HoppSmartConfirmModal
      :show="confirmDeletion"
      :title="`Confirm Deletion of ${team.name} team?`"
      @hide-modal="confirmDeletion = false"
      @resolve="deleteTeamMutation(deleteTeamUID)"
    />
  </div>
</template>

<script setup lang="ts">
import { useClientHandle, useMutation } from '@urql/vue';
import { onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from '../../composables/toast';
import {
  RemoveTeamDocument,
  RenameTeamDocument,
  TeamInfoDocument,
  TeamMemberRole,
  TeamInfoQuery,
} from '../../helpers/backend/graphql';
import IconEdit from '~icons/lucide/edit';
import IconSave from '~icons/lucide/save';

const toast = useToast();

// Switch between team details, members and invites tab
const showMembers = ref(false);
const showPendingInvites = ref(false);
const showTeamDetails = ref(true);

const switchToMembersTab = () => {
  showMembers.value = true;
  showTeamDetails.value = false;
  showPendingInvites.value = false;
};

const switchToPendingInvitesTab = () => {
  showTeamDetails.value = false;
  showMembers.value = false;
  showPendingInvites.value = true;
};

const switchToTeamDetailsTab = () => {
  showTeamDetails.value = true;
  showMembers.value = false;
  showPendingInvites.value = false;
};

// Get the details of the team
const team = ref<TeamInfoQuery['admin']['teamInfo'] | undefined>();
const teamName = ref('');
const route = useRoute();
const fetching = ref(true);
const { client } = useClientHandle();

const getTeamInfo = async () => {
  fetching.value = true;
  const result = await client
    .query(TeamInfoDocument, { teamID: route.params.id.toString() })
    .toPromise();
  if (result.error) {
    return toast.error('Unable to load team info..');
  }
  if (result.data?.admin.teamInfo) {
    team.value = result.data.admin.teamInfo;
    teamName.value = team.value.name;
  }
  fetching.value = false;
};

onMounted(async () => await getTeamInfo());
const updateTeam = async () => await getTeamInfo();

// Rename the team name
const showRenameInput = ref(false);
const teamRename = useMutation(RenameTeamDocument);

const renameTeamName = async () => {
  if (!team.value) return;

  if (team.value.name === teamName.value) {
    showRenameInput.value = false;
    return;
  }
  const variables = { uid: team.value.id, name: teamName.value };
  await teamRename.executeMutation(variables).then((result) => {
    if (result.error) {
      toast.error('Failed to rename team!!');
    } else {
      showRenameInput.value = false;
      if (team.value) {
        team.value.name = teamName.value;
        toast.success('Team renamed successfully!!');
      }
    }
  });
};

// Delete team from the infra
const router = useRouter();
const confirmDeletion = ref(false);
const teamDeletion = useMutation(RemoveTeamDocument);
const deleteTeamUID = ref<string | null>(null);

const deleteTeam = (id: string) => {
  confirmDeletion.value = true;
  deleteTeamUID.value = id;
};

const deleteTeamMutation = async (id: string | null) => {
  if (!id) {
    confirmDeletion.value = false;
    toast.error('Team deletion failed!!');
    return;
  }
  const variables = { uid: id };
  await teamDeletion.executeMutation(variables).then((result) => {
    if (result.error) {
      toast.error('Team deletion failed!!');
    } else {
      toast.success('Team deleted successfully!!');
    }
  });
  confirmDeletion.value = false;
  deleteTeamUID.value = null;
  router.push('/teams');
};

// Update Roles of Members
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
</script>
