<template>
  <div class="border rounded divide-y divide-dividerLight border-divider my-8">
    <HoppSmartPlaceholder
      v-if="team && pendingInvites?.length === 0"
      text="No pending invites"
    />

    <div v-else class="divide-y divide-dividerLight">
      <div
        v-for="(invitee, index) in pendingInvites"
        :key="`invitee-${index}`"
        class="flex divide-x divide-dividerLight"
      >
        <input
          v-if="invitee"
          class="flex flex-1 px-4 py-2 bg-transparent text-secondaryLight"
          :placeholder="t('teams.email_title')"
          :name="'param' + index"
          :value="invitee.inviteeEmail"
          readonly
        />
        <input
          class="flex flex-1 px-4 py-2 bg-transparent text-secondaryLight"
          :placeholder="t('teams.permission')"
          :name="'value' + index"
          :value="invitee.inviteeRole"
          readonly
        />
        <div class="flex">
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('teams.remove')"
            :icon="IconTrash"
            color="red"
            :loading="isLoadingIndex === index"
            @click="removeInvitee(invitee.id, index)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMutation } from '@urql/vue';
import { useVModel } from '@vueuse/core';
import { computed, ref } from 'vue';
import { useI18n } from '~/composables/i18n';
import { useToast } from '~/composables/toast';
import {
  RevokeTeamInvitationDocument,
  TeamInfoQuery,
} from '~/helpers/backend/graphql';
import IconTrash from '~icons/lucide/trash';

const t = useI18n();
const toast = useToast();

const props = defineProps<{
  team: TeamInfoQuery['infra']['teamInfo'];
}>();

const emit = defineEmits<{
  (event: 'update:team', team: TeamInfoQuery['infra']['teamInfo']): void;
}>();

const team = useVModel(props, 'team', emit);
const pendingInvites = computed({
  get: () => team.value?.teamInvitations,
  set: (value) => {
    team.value.teamInvitations = value;
  },
});

// Remove Invitation
const isLoadingIndex = ref<null | number>(null);

const revokeInvitationMutation = useMutation(RevokeTeamInvitationDocument);
const revokeTeamInvitation = (inviteID: string) =>
  revokeInvitationMutation.executeMutation({ inviteID });

const removeInvitee = async (id: string, index: number) => {
  isLoadingIndex.value = index;
  const result = await revokeTeamInvitation(id);
  if (result.error) {
    toast.error(t('state.remove_invitee_failure'));
  } else {
    if (pendingInvites.value) {
      pendingInvites.value = pendingInvites.value.filter(
        (invite: { id: string }) => {
          return invite.id !== id;
        }
      );
      toast.success(t('state.remove_invitee_success'));
    }
  }
  isLoadingIndex.value = null;
};
</script>
