<template>
  <div class="flex flex-col">
    <h1 class="text-lg font-bold text-secondaryDark">
      {{ t('sharedRequests.title') }}
    </h1>

    <div v-if="fetching" class="flex justify-center">
      <HoppSmartSpinner />
    </div>

    <div v-else-if="error">{{ t('sharedRequests.load_list_error') }}</div>

    <div v-else-if="sharedRequests?.length >= 0">
      <div class="flex justify-end my-3">
        <HoppSmartInput
          :autofocus="false"
          v-model="email"
          :label="t('sharedRequests.filter_by_email')"
          input-styles="floating-input rounded-r-none w-64"
        />

        <HoppButtonSecondary
          v-if="showFilterButton"
          :disabled="!email"
          outline
          filled
          :label="t('sharedRequests.filter')"
          :icon="IconFilter"
          class="rounded-l-none"
          @click="filterRequest"
        />
        <HoppButtonSecondary
          v-else
          outline
          filled
          :icon="IconFilterX"
          :label="t('sharedRequests.clear_filter')"
          class="rounded-l-none"
          @click="clearAppliedFilters"
        />
      </div>

      <HoppSmartTable :list="sharedRequests">
        <template #head>
          <tr
            class="text-secondary border-b border-dividerDark text-sm text-left bg-primaryLight"
          >
            <th class="px-6 py-2">{{ t('sharedRequests.id') }}</th>
            <th class="px-6 py-3 w-30">{{ t('sharedRequests.url') }}</th>
            <th class="px-6 py-2">{{ t('sharedRequests.email') }}</th>
            <th class="px-6 py-2">{{ t('sharedRequests.created_on') }}</th>
            <!-- Empty Heading for the Action Button -->
            <th class="px-6 py-2">Actions</th>
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

            <td class="py-4 px-7 max-w-30">
              {{ sharedRequestURL(request.request) }}
            </td>

            <td class="py-4 px-7 max-w-30">
              {{ request.creator.email }}
            </td>

            <td class="py-2 px-7">
              {{ getCreatedDate(request.createdOn) }}
              <div class="text-gray-400 text-tiny">
                {{ getCreatedTime(request.createdOn) }}
              </div>
            </td>

            <td>
              <HoppButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="t('sharedRequests.open_request')"
                :to="`${shortcodeBaseURL}/r/${request.id}`"
                :icon="IconExternalLink"
                class="px-3 text-emerald-500 hover:text-accent"
              />
              <HoppButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="t('sharedRequests.copy')"
                color="green"
                :icon="copyIconRefs"
                class="px-3"
                @click="copySharedRequest(request.id)"
              />
              <HoppButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="t('sharedRequests.delete')"
                :icon="IconTrash"
                color="red"
                class="px-3"
                @click="deleteSharedRequest(request.id)"
              />
            </td>
          </tr>
        </template>
      </HoppSmartTable>

      <div
        v-if="hasNextPage && sharedRequests.length >= sharedRequestsPerPage"
        class="flex items-center w-28 px-3 py-2 mt-5 mx-auto font-semibold text-secondaryDark bg-divider hover:bg-dividerDark rounded-3xl cursor-pointer"
        @click="fetchNextSharedRequests"
      >
        <span class="mr-2">{{ t('sharedRequests.show_more') }}</span>
        <icon-lucide-chevron-down />
      </div>
    </div>

    <div v-else class="mt-2 text-lg">
      {{ t('sharedRequests.no_requests') }}
    </div>
  </div>

  <HoppSmartConfirmModal
    :show="confirmDeletion"
    :title="t('sharedRequests.confirm_request_deletion')"
    @hide-modal="confirmDeletion = false"
    @resolve="deleteSharedRequestMutation(deleteSharedRequestID)"
  />
</template>

<script setup lang="ts">
import { format } from 'date-fns';
import { ref, watch } from 'vue';
import { useMutation } from '@urql/vue';
import { refAutoReset } from '@vueuse/core';
import {
  SharedRequestsDocument,
  RevokeShortcodeByAdminDocument,
} from '../helpers/backend/graphql';
import { usePagedQuery } from '~/composables/usePagedQuery';
import { useToast } from '~/composables/toast';
import { useI18n } from '~/composables/i18n';
import { copyToClipboard } from '~/helpers/utils/clipboard';
import IconTrash from '~icons/lucide/trash';
import IconCopy from '~icons/lucide/copy';
import IconCheck from '~icons/lucide/check';
import IconFilter from '~icons/lucide/filter';
import IconFilterX from '~icons/lucide/filter-x';
import IconExternalLink from '~icons/lucide/external-link';

const t = useI18n();
const toast = useToast();
const email = ref('');

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
  { cursor: undefined, take: sharedRequestsPerPage }
);

// Filter Shared Requests
const showFilterButton = ref(true);

const filterRequest = () => {
  showFilterButton.value = false;
  refetch(email.value);
};

const clearAppliedFilters = () => {
  email.value = '';
  showFilterButton.value = true;
  refetch();
};

watch(email, () => {
  if (email.value.length === 0) {
    refetch();
  }
  if (!showFilterButton.value) {
    showFilterButton.value = true;
  }
});

// Return request endpoint from the request object
const sharedRequestURL = (request: string) => {
  const parsedRequest = JSON.parse(request);
  return parsedRequest.endpoint;
};

// Shortcode Base URL
const shortcodeBaseURL =
  import.meta.env.VITE_SHORTCODE_BASE_URL ?? 'https://hopp.sh';

// Copy Shared Request
const copyIconRefs = refAutoReset<typeof IconCopy | typeof IconCheck>(
  IconCopy,
  1000
);

const copySharedRequest = (requestID: string) => {
  copyToClipboard(`${shortcodeBaseURL}/r/${requestID}`);
  toast.success(`${t('state.copied_to_clipboard')}`);
  copyIconRefs.value = IconCheck;
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
      refetch(email.value);
      toast.success(`${t('state.delete_request_success')}`);
    }
  });
  confirmDeletion.value = false;
  deleteSharedRequestID.value = null;
};
</script>
