<template>
  <div>
    <div v-if="fetching" class="flex justify-center">
      <HoppSmartSpinner />
    </div>

    <div v-else-if="error">{{ t('shared_requests.load_list_error') }}</div>

    <div v-else-if="sharedRequests.length === 0" class="ml-3 mt-5 text-lg">
      {{ t('users.no_shared_requests') }}
    </div>

    <div v-else class="mt-10">
      <HoppSmartTable :list="sharedRequests">
        <template #head>
          <tr
            class="text-secondary border-b border-dividerDark text-sm text-left bg-primaryLight"
          >
            <th class="px-6 py-2">{{ t('shared_requests.id') }}</th>
            <th class="px-6 py-2 w-30">{{ t('shared_requests.url') }}</th>
            <th class="px-6 py-2">{{ t('shared_requests.created_on') }}</th>
            <!-- Empty Heading for the Action Button -->
            <th class="px-6 py-2 text-center">Actions</th>
          </tr>
        </template>
        <template #body="{ list: sharedRequests }">
          <tr
            v-for="request in sharedRequests"
            :key="request.id"
            class="text-secondaryDark hover:bg-divider hover:cursor-pointer rounded-xl"
          >
            <td class="flex py-4 px-7 max-w-50">
              <span class="truncate">
                {{ request.id }}
              </span>
            </td>

            <td class="py-4 px-7 w-96">
              {{ sharedRequestURL(request.request) }}
            </td>

            <td class="py-2 px-7">
              {{ getCreatedDate(request.createdOn) }}
              <div class="text-gray-400 text-tiny">
                {{ getCreatedTime(request.createdOn) }}
              </div>
            </td>

            <td class="flex justify-center">
              <HoppButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="t('shared_requests.open_request')"
                :to="`${shortcodeBaseURL}/r/${request.id}`"
                :blank="true"
                :icon="IconExternalLink"
                class="px-3 text-emerald-500 hover:text-accent"
              />

              <UiAutoResetIcon
                :title="t('shared_requests.copy')"
                :icon="{ default: IconCopy, temporary: IconCheck }"
                @click="copySharedRequest(request.id)"
              />

              <HoppButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="t('shared_requests.delete')"
                :icon="IconTrash"
                color="red"
                class="px-3"
                @click="deleteSharedRequest(request.id)"
              />
            </td>
          </tr>
        </template>
      </HoppSmartTable>

      <!-- Pagination -->
      <div
        v-if="hasNextPage && sharedRequests.length >= sharedRequestsPerPage"
        class="flex items-center w-28 px-3 py-2 mt-5 mx-auto font-semibold text-secondaryDark bg-divider hover:bg-dividerDark rounded-3xl cursor-pointer"
        @click="fetchNextSharedRequests"
      >
        <span class="mr-2">{{ t('shared_requests.show_more') }}</span>
        <icon-lucide-chevron-down />
      </div>
    </div>
  </div>

  <HoppSmartConfirmModal
    :show="confirmDeletion"
    :title="t('shared_requests.confirm_request_deletion')"
    @hide-modal="confirmDeletion = false"
    @resolve="deleteSharedRequestMutation(deleteSharedRequestID)"
  />
</template>

<script setup lang="ts">
import { format } from 'date-fns';
import { ref } from 'vue';
import { useMutation } from '@urql/vue';
import {
  SharedRequestsDocument,
  RevokeShortcodeByAdminDocument,
} from '../../helpers/backend/graphql';
import { usePagedQuery } from '~/composables/usePagedQuery';
import { useToast } from '~/composables/toast';
import { useI18n } from '~/composables/i18n';
import { copyToClipboard } from '~/helpers/utils/clipboard';
import IconTrash from '~icons/lucide/trash';
import IconCopy from '~icons/lucide/copy';
import IconCheck from '~icons/lucide/check';
import IconExternalLink from '~icons/lucide/external-link';

const t = useI18n();
const toast = useToast();

const props = defineProps<{
  email: string;
}>();

// Get Desired Date Formats
const getCreatedDate = (date: string) => format(new Date(date), 'dd-MM-yyyy');
const getCreatedTime = (date: string) => format(new Date(date), 'hh:mm a');

//Fetch Shared Requests
const sharedRequestsPerPage = 30;

const {
  fetching,
  error,
  goToNextPage: fetchNextSharedRequests,
  refetch,
  list: sharedRequests,
  hasNextPage,
} = usePagedQuery(
  SharedRequestsDocument,
  (x) => x.infra.allShortcodes,
  (x) => x.id,
  sharedRequestsPerPage,
  { cursor: undefined, take: sharedRequestsPerPage, email: props.email }
);

// Return request endpoint from the request object
const sharedRequestURL = (request: string) => {
  const parsedRequest = JSON.parse(request);
  return parsedRequest.endpoint;
};

// Shortcode Base URL
const shortcodeBaseURL =
  import.meta.env.VITE_SHORTCODE_BASE_URL ?? 'https://hopp.sh';

// Copy Shared Request to Clipboard
const copySharedRequest = (requestID: string) => {
  copyToClipboard(`${shortcodeBaseURL}/r/${requestID}`);
  toast.success(`${t('state.copied_to_clipboard')}`);
};

// Shared Request Deletion
const confirmDeletion = ref(false);
const deleteSharedRequestID = ref<string | null>(null);
const sharedRequestDeletion = useMutation(RevokeShortcodeByAdminDocument);

const deleteSharedRequest = (id: string) => {
  confirmDeletion.value = true;
  deleteSharedRequestID.value = id;
};

const deleteSharedRequestMutation = async (id: string | null) => {
  if (!id) {
    confirmDeletion.value = false;
    toast.error(`${t('state.delete_request_failure')}`);
    return;
  }
  const variables = { codeID: id };
  await sharedRequestDeletion.executeMutation(variables).then((result) => {
    if (result.error) {
      toast.error(`${t('state.delete_request_failure')}`);
    } else {
      sharedRequests.value = sharedRequests.value.filter(
        (request) => request.id !== id
      );
      refetch();
      toast.success(`${t('state.delete_request_success')}`);
    }
  });
  confirmDeletion.value = false;
  deleteSharedRequestID.value = null;
};
</script>
