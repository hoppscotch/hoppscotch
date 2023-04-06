<template>
  <HoppSmartModal v-if="show" dialog title="Add Member" @close="hideModal">
    <template #body>
      <div v-if="addingUserToTeam" class="flex items-center justify-center p-4">
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
              @click="addNewMember"
            />
          </div>
        </div>
        <div class="border rounded divide-y divide-dividerLight border-divider">
          <div
            v-for="(member, index) in newMembersList"
            :key="`new-member-${index}`"
            class="flex divide-x divide-dividerLight"
          >
            <HoppSmartAutoComplete
              v-model="member.key"
              placeholder="Email"
              :source="allUsersEmail"
              :name="'member' + index"
              :spellcheck="true"
              styles="
                w-full pl-3 bg-neutral-900 border-gray-600
              "
              class="flex-1 !flex"
              @input="(email: string) => member.key = email"
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
                    :value="member.value"
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
                        member.value === 'OWNER' ? IconCircleDot : IconCircle
                      "
                      :active="member.value === 'OWNER'"
                      @click="
                        () => {
                          updateNewMemberRole(index, TeamMemberRole.Owner);
                          hide();
                        }
                      "
                    />
                    <HoppSmartItem
                      label="EDITOR"
                      :icon="
                        member.value === 'EDITOR' ? IconCircleDot : IconCircle
                      "
                      :active="member.value === 'EDITOR'"
                      @click="
                        () => {
                          updateNewMemberRole(index, TeamMemberRole.Editor);
                          hide();
                        }
                      "
                    />
                    <HoppSmartItem
                      label="VIEWER"
                      :icon="
                        member.value === 'VIEWER' ? IconCircleDot : IconCircle
                      "
                      :active="member.value === 'VIEWER'"
                      @click="
                        () => {
                          updateNewMemberRole(index, TeamMemberRole.Viewer);
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
                @click="removeNewMember(index)"
              />
            </div>
          </div>
          <div
            v-if="newMembersList.length === 0"
            class="flex flex-col items-center justify-center p-4 text-secondaryLight"
          >
            <img
              :src="`/images/states/dark/add_group.svg`"
              loading="lazy"
              class="inline-flex flex-col object-contain object-center w-16 h-16 mb-4"
            />
            <span class="pb-4 text-center"> No invites </span>
            <HoppButtonSecondary label="Add new" filled @click="addNewMember" />
          </div>
        </div>
        <div
          v-if="newMembersList.length"
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
      <span class="flex space-x-2">
        <HoppButtonPrimary
          label="Add Member"
          outline
          @click="addUserasTeamMember"
        />
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
  AddUserToTeamByAdminDocument,
  TeamMemberRole,
  MetricsDocument,
  UsersListDocument,
} from '../../helpers/backend/graphql';
import { useToast } from '~/composables/toast';
import { useMutation, useQuery } from '@urql/vue';
import { Email, EmailCodec } from '~/helpers/backend/Email';
import IconTrash from '~icons/lucide/trash';
import IconPlus from '~icons/lucide/plus';
import IconHelpCircle from '~icons/lucide/help-circle';
import IconCircleDot from '~icons/lucide/circle-dot';
import IconCircle from '~icons/lucide/circle';
import { computed } from 'vue';
import { usePagedQuery } from '~/composables/usePagedQuery';

// Get Users List
const { data } = useQuery({ query: MetricsDocument });
const usersPerPage = computed(() => data.value?.admin.usersCount || 10000);

const { list: usersList } = usePagedQuery(
  UsersListDocument,
  (x) => x.admin.allUsers,
  (x) => x.uid,
  usersPerPage.value,
  { cursor: undefined, take: usersPerPage.value }
);

const allUsersEmail = computed(() => usersList.value.map((user) => user.email));

const toast = useToast();

// Template refs
const tippyActions = ref<any | null>(null);

const props = defineProps({
  show: Boolean,
  editingTeamID: { type: String, default: null },
});

const emit = defineEmits<{
  (e: 'hide-modal'): void;
  (e: 'member'): void;
}>();

const newMembersList = ref<Array<{ key: string; value: TeamMemberRole }>>([
  {
    key: '',
    value: TeamMemberRole.Viewer,
  },
]);

const addNewMember = () => {
  newMembersList.value.push({
    key: '',
    value: TeamMemberRole.Viewer,
  });
};

const updateNewMemberRole = (index: number, role: TeamMemberRole) => {
  newMembersList.value[index].value = role;
};

const removeNewMember = (id: number) => {
  newMembersList.value.splice(id, 1);
};

const addingUserToTeam = ref<boolean>(false);

const addUserasTeamMember = async () => {
  addingUserToTeam.value = true;

  const validationResult = pipe(
    newMembersList.value,
    O.fromPredicate(
      (
        memberInvites
      ): memberInvites is Array<{ key: Email; value: TeamMemberRole }> =>
        pipe(
          memberInvites,
          A.every((member) => EmailCodec.is(member.key))
        )
    ),
    O.map(
      A.map((member) =>
        addUserToTeam(member.key, member.value, props.editingTeamID)
      )
    )
  );

  if (O.isNone(validationResult)) {
    // Error handling for no validation
    toast.error('Invalid User!!');
    addingUserToTeam.value = false;
    return;
  }

  hideModal();
};

const hideModal = () => {
  addingUserToTeam.value = false;
  newMembersList.value = [
    {
      key: '',
      value: TeamMemberRole.Viewer,
    },
  ];
  emit('hide-modal');
};

const addUserToTeamMutation = useMutation(AddUserToTeamByAdminDocument);
const addUserToTeam = async (
  email: string,
  userRole: TeamMemberRole,
  teamID: string
) => {
  const variables = { userEmail: email, role: userRole, teamID: teamID };

  const res = await addUserToTeamMutation
    .executeMutation(variables)
    .then((result) => {
      if (result.error) {
        if (result.error.toString() == '[GraphQL] user/not_found') {
          toast.error('User not found in the infra!!');
        } else {
          toast.error('Failed to add user to the team!!');
        }
      } else {
        toast.success('User is now a member of the team!!');
        emit('member');
      }
    });
  return res;
};
</script>
