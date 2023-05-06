<template>
  <div class="border rounded divide-y divide-dividerLight border-divider my-8">
    <div v-if="fetching" class="flex items-center justify-center p-4">
      <HoppSmartSpinner />
    </div>
    <div v-else>
      <div v-if="team" class="divide-y divide-dividerLight">
        <div
          v-for="(invitee, index) in pendingInvites"
          :key="`invitee-${index}`"
          class="flex divide-x divide-dividerLight"
        >
          <input
            v-if="invitee"
            class="flex flex-1 px-4 py-2 bg-transparent text-secondaryLight"
            placeholder="Email"
            :name="'param' + index"
            :value="invitee.inviteeEmail"
            readonly
          />
          <input
            class="flex flex-1 px-4 py-2 bg-transparent text-secondaryLight"
            placeholder="Permissions"
            :name="'value' + index"
            :value="invitee.inviteeRole"
            readonly
          />
          <div class="flex">
            <HoppButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              title="Remove"
              :icon="IconTrash"
              color="red"
              :loading="isLoadingIndex === index"
              @click="removeInvitee(invitee.id, index)"
            />
          </div>
        </div>
      </div>
      <div
        v-if="team && pendingInvites?.length === 0"
        class="flex flex-col items-center justify-center p-4 text-secondaryLight"
      >
        <span class="text-center"> No pending invites </span>
      </div>
      <div v-if="!fetching && error" class="flex flex-col items-center p-4">
        <icon-lucide-help-circle class="mb-4 svg-icons" />
        Something went wrong. Please try again later.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import IconTrash from '~icons/lucide/trash';
import { useMutation, useClientHandle } from '@urql/vue';
import { ref, onMounted } from 'vue';
import {
  RevokeTeamInvitationDocument,
  TeamInfoDocument,
  TeamInfoQuery,
} from '~/helpers/backend/graphql';
import { useToast } from '~/composables/toast';
import { useRoute } from 'vue-router';

const toast = useToast();

// Get details of the team
const fetching = ref(true);
const error = ref(false);
const { client } = useClientHandle();
const route = useRoute();
const team = ref<TeamInfoQuery['admin']['teamInfo'] | undefined>();
const pendingInvites = ref<
  TeamInfoQuery['admin']['teamInfo']['teamInvitations'] | undefined
>();

const getTeamInfo = async () => {
  fetching.value = true;
  const result = await client
    .query(TeamInfoDocument, { teamID: route.params.id.toString() })
    .toPromise();

  if (result.error) {
    error.value = true;
    return toast.error('Unable to load team details..');
  }

  if (result.data?.admin.teamInfo) {
    team.value = result.data.admin.teamInfo;
    pendingInvites.value = team.value.teamInvitations;
  }
  fetching.value = false;
};

onMounted(async () => await getTeamInfo());

// Remove Invitation
const isLoadingIndex = ref<null | number>(null);

const revokeInvitationMutation = useMutation(RevokeTeamInvitationDocument);
const revokeTeamInvitation = (inviteID: string) =>
  revokeInvitationMutation.executeMutation({ inviteID });

const removeInvitee = async (id: string, index: number) => {
  isLoadingIndex.value = index;
  const result = await revokeTeamInvitation(id);
  if (result.error) {
    toast.error('Removal of invitee failed!!');
  } else {
    if (pendingInvites.value) {
      pendingInvites.value = pendingInvites.value.filter(
        (invite: { id: string }) => {
          return invite.id !== id;
        }
      );
      toast.success('Removal of invitee is successfull!!');
    }
  }
  isLoadingIndex.value = null;
};
</script>
