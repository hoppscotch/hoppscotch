<template>
  <HoppSmartModal v-if="show" dialog title="Add Member" @close="hideModal">
    <template #body>
      <div v-if="sendInvitesResult.length" class="flex flex-col px-4">
        <div class="flex flex-col items-center justify-center max-w-md">
          <icon-lucide-users class="w-6 h-6 text-accent" />
          <h3 class="my-2 text-lg text-center">
            We have sent you an invite link
          </h3>
          <p class="text-center">
            You can use this link to invite your team members to join your team.
          </p>
        </div>
        <div
          class="flex flex-col p-4 mt-8 border rounded space-y-6 border-dividerLight"
        >
          <div
            v-for="(invitee, index) in sendInvitesResult"
            :key="`invitee-${index}`"
          >
            <p class="flex items-center">
              <component
                :is="
                  invitee.status === 'error' ? IconAlertTriangle : IconMailCheck
                "
                class="mr-4 svg-icons"
                :class="
                  invitee.status === 'error' ? 'text-red-500' : 'text-green-500'
                "
              />
              <span class="truncate">{{ invitee.email }}</span>
            </p>
            <p v-if="invitee.status === 'error'" class="mt-2 ml-8 text-red-500">
              {{ getErrorMessage(invitee.error) }}
            </p>
          </div>
        </div>
      </div>
      <div
        v-else-if="sendingInvites"
        class="flex items-center justify-center p-4"
      >
        <HoppSmartSpinner />
      </div>
      <div v-else class="flex flex-col">
        <div class="flex items-center justify-between flex-1 pt-4">
          <label for="memberList" class="p-4"> Add members </label>
          <div class="flex">
            <HoppButtonSecondary
              :icon="IconPlus"
              label="Add new"
              filled
              @click="addNewInvitee"
            />
          </div>
        </div>
        <div class="border rounded divide-y divide-dividerLight border-divider">
          <div
            v-for="(invitee, index) in newInvites"
            :key="`new-invitee-${index}`"
            class="flex divide-x divide-dividerLight"
          >
            <input
              v-model="invitee.key"
              class="flex flex-1 px-4 py-2 bg-transparent"
              placeholder="Email"
              :name="'invitee' + index"
              autofocus
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
                    :value="invitee.value"
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
                        invitee.value === 'OWNER' ? IconCircleDot : IconCircle
                      "
                      :active="invitee.value === 'OWNER'"
                      @click="
                        () => {
                          updateNewInviteeRole(index, TeamMemberRole.Owner);
                          hide();
                        }
                      "
                    />
                    <HoppSmartItem
                      label="EDITOR"
                      :icon="
                        invitee.value === 'EDITOR' ? IconCircleDot : IconCircle
                      "
                      :active="invitee.value === 'EDITOR'"
                      @click="
                        () => {
                          updateNewInviteeRole(index, TeamMemberRole.Editor);
                          hide();
                        }
                      "
                    />
                    <HoppSmartItem
                      label="VIEWER"
                      :icon="
                        invitee.value === 'VIEWER' ? IconCircleDot : IconCircle
                      "
                      :active="invitee.value === 'VIEWER'"
                      @click="
                        () => {
                          updateNewInviteeRole(index, TeamMemberRole.Viewer);
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
                :icon="IconTrash"
                color="red"
                @click="removeNewInvitee(index)"
              />
            </div>
          </div>
          <div
            v-if="newInvites.length === 0"
            class="flex flex-col items-center justify-center p-4 text-secondaryLight"
          >
            <img
              :src="`/images/states/dark/add_group.svg`"
              loading="lazy"
              class="inline-flex flex-col object-contain object-center w-16 h-16 mb-4"
            />
            <span class="pb-4 text-center"> No invites </span>
            <HoppButtonSecondary
              label="Add new"
              filled
              @click="addNewInvitee"
            />
          </div>
        </div>
        <div
          v-if="newInvites.length"
          class="flex flex-col items-start px-4 py-4 mt-4 border rounded border-dividerLight"
        >
          <span
            class="flex items-center justify-center px-2 py-1 mb-4 font-semibold border rounded-full bg-primaryDark border-divider"
          >
            <component
              :is="IconHelpCircle"
              class="mr-2 text-secondaryLight svg-icons"
            />
            Roles
          </span>
          <p>
            <span class="text-secondaryLight">
              Roles are used to control access to the shared collections.
            </span>
          </p>
          <ul class="mt-4 space-y-4">
            <li class="flex">
              <span
                class="w-1/4 font-semibold uppercase truncate text-secondaryDark max-w-16"
              >
                Owner
              </span>
              <span class="flex flex-1">
                Owners can add, edit, and delete requests, collections and team
                members.
              </span>
            </li>
            <li class="flex">
              <span
                class="w-1/4 font-semibold uppercase truncate text-secondaryDark max-w-16"
              >
                Editor
              </span>
              <span class="flex flex-1">
                Editors can add, edit, and delete requests.
              </span>
            </li>
            <li class="flex">
              <span
                class="w-1/4 font-semibold uppercase truncate text-secondaryDark max-w-16"
              >
                Viewer
              </span>
              <span class="flex flex-1">
                Viewers can only view and use requests.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </template>

    <template #footer>
      <p
        v-if="sendInvitesResult.length"
        class="flex justify-between flex-1 text-secondaryLight"
      >
        <HoppButtonSecondary
          class="link !p-0"
          label="Invite more"
          :icon="IconArrowLeft"
          @click="
            () => {
              sendInvitesResult = [];
              newInvites = [
                {
                  key: '',
                  value: TeamMemberRole.Viewer,
                },
              ];
            }
          "
        />
        <HoppButtonSecondary
          class="link !p-0"
          label="Dismiss"
          @click="hideModal"
        />
      </p>
      <span v-else class="flex space-x-2">
        <HoppButtonPrimary label="Invite" outline @click="sendInvites" />
        <HoppButtonSecondary label="Cancel" outline filled @click="hideModal" />
      </span>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import * as A from 'fp-ts/Array';
import * as O from 'fp-ts/Option';
import { pipe } from 'fp-ts/function';
import {
  TeamMemberRole,
  CreateTeamInvitationDocument,
} from '../../helpers/backend/graphql';

import { useToast } from '~/composables/toast';

import IconTrash from '~icons/lucide/trash';
import IconPlus from '~icons/lucide/plus';
import IconHelpCircle from '~icons/lucide/help-circle';
import IconAlertTriangle from '~icons/lucide/alert-triangle';
import IconMailCheck from '~icons/lucide/mail-check';
import IconCircleDot from '~icons/lucide/circle-dot';
import IconCircle from '~icons/lucide/circle';
import IconArrowLeft from '~icons/lucide/arrow-left';
import { useMutation } from '@urql/vue';
import { Email, EmailCodec } from '~/helpers/backend/Email';

const toast = useToast();

// Template refs
const tippyActions = ref<any | null>(null);

const props = defineProps({
  show: Boolean,
  editingTeamID: { type: String, default: null },
});

const emit = defineEmits<{
  (e: 'hide-modal'): void;
}>();

const t = (key: string) => key;

const newInvites = ref<Array<{ key: string; value: TeamMemberRole }>>([
  {
    key: '',
    value: TeamMemberRole.Viewer,
  },
]);

const addNewInvitee = () => {
  newInvites.value.push({
    key: '',
    value: TeamMemberRole.Viewer,
  });
};

const updateNewInviteeRole = (index: number, role: TeamMemberRole) => {
  newInvites.value[index].value = role;
};

const removeNewInvitee = (id: number) => {
  newInvites.value.splice(id, 1);
};

type SendInvitesErrorType =
  | {
      email: Email;
      status: 'error';
      error: any;
    }
  | {
      email: Email;
      status: 'success';
    };

const sendInvitesResult = ref<Array<SendInvitesErrorType>>([]);

const sendingInvites = ref<boolean>(false);

const sendInvites = async () => {
  sendingInvites.value = true;

  const validationResult = pipe(
    newInvites.value,
    O.fromPredicate(
      (invites): invites is Array<{ key: Email; value: TeamMemberRole }> =>
        pipe(
          invites,
          A.every((invitee) => EmailCodec.is(invitee.key))
        )
    ),
    O.map(
      A.map((invitee) =>
        createTeamInvitation(invitee.key, invitee.value, props.editingTeamID)
      )
    )
  );

  if (O.isNone(validationResult)) {
    // Error handling for no validation
    toast.error(`Invalid email address`);
    sendingInvites.value = false;
    return;
  }

  hideModal();
};

const getErrorMessage = (error: SendInvitesErrorType | any) => {
  if (error.type === 'network_error') {
    return t('error.network_error');
  } else {
    switch (error.error) {
      case 'team/invalid_id':
        return t('team.invalid_id');
      case 'team/member_not_found':
        return t('team.member_not_found');
      case 'team_invite/already_member':
        return t('team.already_member');
      case 'team_invite/member_has_invite':
        return t('team.member_has_invite');
    }
  }
};

const hideModal = () => {
  sendingInvites.value = false;
  sendInvitesResult.value = [];
  newInvites.value = [
    {
      key: '',
      value: TeamMemberRole.Viewer,
    },
  ];
  emit('hide-modal');
};

const teamInvitationMutation = useMutation(CreateTeamInvitationDocument);
const createTeamInvitation = async (
  inviteeEmail: Email,
  inviteeRole: TeamMemberRole,
  teamID: string
) => {
  const res = await teamInvitationMutation.executeMutation({
    inviteeEmail,
    inviteeRole,
    teamID,
  });

  return res;
};
</script>
