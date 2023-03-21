<template>
  <div class="flex items-center justify-between flex-1">
    <label for="memberList" class="pb-4"> Pending Invites </label>
  </div>
  <div class="border rounded divide-y divide-dividerLight border-divider">
    <div v-if="fetching" class="flex items-center justify-center p-4">
      <HoppSmartSpinner />
    </div>
    <div v-else>
      <div v-if="data" class="divide-y divide-dividerLight">
        <div
          v-for="(invitee, index) in data?.team?.teamInvitations"
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
        v-if="data && data?.team?.teamInvitations.length === 0"
        class="flex flex-col items-center justify-center p-4 text-secondaryLight"
      >
        <span class="text-center"> No pending invites </span>
      </div>
      <div v-if="!fetching && error" class="flex flex-col items-center p-4">
        <component :is="IconHelpCircle" class="mb-4 svg-icons" />
        Something went wrong. Please try again later.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import IconTrash from '~icons/lucide/trash';
import IconHelpCircle from '~icons/lucide/help-circle';
import { useMutation, useQuery } from '@urql/vue';
import { ref } from 'vue';
import {
  GetPendingInvitesDocument,
  RevokeTeamInvitationDocument,
} from '~/helpers/backend/graphql';
import { useToast } from '~/composables/toast';

const props = defineProps({
  editingTeamID: { type: String, default: null },
});

const toast = useToast();
const isLoadingIndex = ref<null | number>(null);

const { fetching, data, error } = useQuery({
  query: GetPendingInvitesDocument,
  variables: {
    teamID: props.editingTeamID,
  },
});

console.log(data);

const removeInvitee = async (id: string, index: number) => {
  isLoadingIndex.value = index;
  const result = await revokeTeamInvitation(id);
  if (result.error) {
    toast.error(`Member could not be removed`);
  } else {
    toast.success(`Member removed successfully`);
  }
  isLoadingIndex.value = null;
};

const revokeInvitationMutation = useMutation(RevokeTeamInvitationDocument);
function revokeTeamInvitation(inviteID: string) {
  return revokeInvitationMutation.executeMutation({ inviteID });
}
</script>
