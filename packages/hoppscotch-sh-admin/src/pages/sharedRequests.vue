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
          label="Filter By Email"
          input-styles="floating-input rounded-r-none w-64"
        />

        <HoppButtonSecondary
          v-if="filter"
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
          label="Clear Filter"
          :icon="IconFilterX"
          class="rounded-l-none"
          @click="clearFilter"
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
        <template #body="{ list }">
          <tr
            v-for="request in list"
            :key="request.id"
            class="text-secondaryDark hover:bg-divider hover:cursor-pointer rounded-xl"
          >
            <td class="flex py-4 px-7 max-w-50">
              <span class="truncate">
                {{ request.id }}
              </span>
            </td>

            <td class="py-4 px-7 max-w-30">
              {{ endpoint(request) }}
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

            <td class="w-30">
              <HoppButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="t('sharedRequests.open_request')"
                blank
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
        class="flex justify-center my-5 px-3 py-2 cursor-pointer font-semibold rounded-3xl bg-dividerDark hover:bg-divider transition text-secondaryDark w-30"
        @click="fetchNextSharedRequests"
      >
        <span>{{ t('sharedRequests.show_more') }}</span>
        <icon-lucide-chevron-down class="ml-2 text-lg" />
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
import {
  SharedRequestsDocument,
  RevokeShortcodeByAdminDocument,
} from '../helpers/backend/graphql';
import { usePagedQuery } from '~/composables/usePagedQuery';
import { ref, watch } from 'vue';
import { refAutoReset } from '@vueuse/core';
import { useMutation } from '@urql/vue';
import { useToast } from '~/composables/toast';
import IconTrash from '~icons/lucide/trash';
import IconCopy from '~icons/lucide/copy';
import IconCheck from '~icons/lucide/check';
import IconFilter from '~icons/lucide/filter';
import IconFilterX from '~icons/lucide/filter-x';
import IconExternalLink from '~icons/lucide/external-link';
import { useI18n } from '~/composables/i18n';
import { HoppButtonSecondary } from '@hoppscotch/ui';
import { copyToClipboard } from '~/helpers/utils/clipboard';

// Get Proper Date Formats
const getCreatedDate = (date: string) => format(new Date(date), 'dd-MM-yyyy');
const getCreatedTime = (date: string) => format(new Date(date), 'hh:mm a');

const t = useI18n();

const toast = useToast();

const sharedRequestsPerPage = 2;

const email = ref('');

const endpoint = (request: any) => {
  const parsedRequest = JSON.parse(request.request);
  return parsedRequest.endpoint;
};

const shortcodeBaseURL =
  import.meta.env.VITE_SHORTCODE_BASE_URL ?? 'https://hopp.sh';

const copyIconRefs = refAutoReset<typeof IconCopy | typeof IconCheck>(
  IconCopy,
  1000
);

const copySharedRequest = (requestID: string) => {
  copyToClipboard(`${shortcodeBaseURL}/r/${requestID}`);
  toast.success(`${t('state.copied_to_clipboard')}`);
  copyIconRefs.value = IconCheck;
};

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

// Define a reactive reference to a boolean value set to true
const filter = ref(true);

// Define a function that sets the filter value to false and calls the refetch function with the current value of the email reference
const filterRequest = () => {
  filter.value = false;
  refetch(email.value);
};

// Define a function that sets the filter value to true, sets the email value to an empty string, and calls the refetch function
const clearFilter = () => {
  filter.value = true;
  email.value = '';
  refetch();
};

// Define a watcher on the email reference that sets the filter value to true if it is currently false
watch(email, () => {
  if (email.value.length === 0) {
    refetch();
  }
  if (!filter.value) {
    filter.value = true;
  }
});

// Shared Request Deletion
const sharedRequestDeletion = useMutation(RevokeShortcodeByAdminDocument);
const confirmDeletion = ref(false);
const deleteSharedRequestID = ref<string | null>(null);

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
      toast.success(`${t('state.delete_request_success')}`);
    }
  });
  confirmDeletion.value = false;
  deleteSharedRequestID.value = null;
};
</script>
