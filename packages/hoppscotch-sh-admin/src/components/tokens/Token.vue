<template>
  <TokensOverview
    @show-access-tokens-generate-modal="showAccessTokensGenerateModal = true"
  />

  <TokensList
    :access-tokens="accessTokens"
    :has-error="tokensListFetchErrored"
    :has-more-tokens="hasMoreTokens"
    :loading="tokensListLoading"
    @delete-access-token="displayDeleteInfraTokenConfirmationModal"
    @fetch-more-tokens="fetchAccessTokens"
  />

  <TokensGenerateModal
    v-if="showAccessTokensGenerateModal"
    :access-token="accessToken"
    :token-generate-action-loading="tokenGenerateActionLoading"
    @generate-access-token="generateAccessToken"
    @hide-modal="hideInfraTokenGenerateModal"
  />

  <HoppSmartConfirmModal
    :show="confirmDeleteAccessToken"
    :loading-state="tokenDeleteActionLoading"
    :title="
      t('state.confirm_delete_access_token', {
        tokenLabel: tokenToDelete?.label,
      })
    "
    @hide-modal="confirmDeleteAccessToken = false"
    @resolve="deleteInfraToken"
  />
</template>

<script setup lang="ts">
import { useI18n } from '~/composables/i18n';
import { useToast } from '~/composables/toast';
import { useMutation } from '@urql/vue';
import { Ref, ref, watch } from 'vue';
import { usePagedQuery } from '~/composables/usePagedQuery';
import {
  CreateInfraTokenDocument,
  InfraTokensDocument,
  InfraTokensQuery,
  RevokeInfraTokenDocument,
} from '~/helpers/backend/graphql';

export type AccessToken = {
  id: string;
  label: string;
  createdOn: string;
  lastUsedOn: string;
  expiresOn: string | null;
};

const t = useI18n();
const toast = useToast();

const confirmDeleteAccessToken = ref(false);
const hasMoreTokens = ref(false);
const showAccessTokensGenerateModal = ref(false);
const tokenDeleteActionLoading = ref(false);
const tokenGenerateActionLoading = ref(false);

const accessToken: Ref<string | null> = ref(null);
const tokenToDelete = ref<{ id: string; label: string } | null>(null);

// const accessTokens: Ref<AccessToken[]> = ref([]);
const accessTokens: Ref<InfraTokensQuery['infraTokens']> = ref([]);

const limit = 12;
let offset = 0;

const {
  fetching: tokensListLoading,
  error: tokensListFetchErrored,
  list: tokensList,
} = usePagedQuery(InfraTokensDocument, (x) => x.infraTokens, 10, {
  skip: 0,
  take: 10,
});

watch(tokensList.value, async () => {
  await fetchAccessTokens();
});

const fetchAccessTokens = async () => {
  accessTokens.value.push(...tokensList.value);

  if (tokensList.value.length > 0) {
    offset += tokensList.value.length;
  }

  hasMoreTokens.value = tokensList.value.length === limit;
};

const createInfraTokens = useMutation(CreateInfraTokenDocument);

const generateAccessToken = async ({
  label,
  expiryInDays,
}: {
  label: string;
  expiryInDays: number | null;
}) => {
  tokenGenerateActionLoading.value = true;

  const variables = {
    label,
    expiryInDays,
  };

  const result = await createInfraTokens.executeMutation(variables);

  if (result.error) {
    toast.error(t('error.generate_access_token'));
    showAccessTokensGenerateModal.value = false;
  } else {
    accessTokens.value.unshift(result.data!.createInfraToken.info);
    accessToken.value = result.data!.createInfraToken.token;
    offset += 1;

    if (tokensListFetchErrored.value) {
      tokensListFetchErrored.value = false;
    }
  }
  tokenGenerateActionLoading.value = false;
};

const revokeInfraToken = useMutation(RevokeInfraTokenDocument);

const deleteInfraToken = async () => {
  if (tokenToDelete.value === null) {
    toast.error(t('error.something_went_wrong'));
    return;
  }

  const { id: tokenIdToDelete, label: tokenLabelToDelete } =
    tokenToDelete.value;

  tokenDeleteActionLoading.value = true;

  const result = await revokeInfraToken.executeMutation({
    id: tokenIdToDelete,
  });

  if (result.error) {
    toast.error(t('error.delete_access_token'));
  } else {
    accessTokens.value = accessTokens.value.filter(
      (token) => token.id !== tokenIdToDelete
    );

    offset = offset > 0 ? offset - 1 : offset;

    toast.success(
      t('access_tokens.deletion_success', { label: tokenLabelToDelete })
    );

    if (tokensListFetchErrored.value) {
      tokensListFetchErrored.value = false;
    }
  }

  tokenDeleteActionLoading.value = false;
  confirmDeleteAccessToken.value = false;
  tokenToDelete.value = null;
};

const hideInfraTokenGenerateModal = () => {
  // Reset the reactive state variable holding access token value and hide the modal
  accessToken.value = null;
  showAccessTokensGenerateModal.value = false;
};

const displayDeleteInfraTokenConfirmationModal = ({
  tokenId,
  tokenLabel,
}: {
  tokenId: string;
  tokenLabel: string;
}) => {
  confirmDeleteAccessToken.value = true;

  tokenToDelete.value = {
    id: tokenId,
    label: tokenLabel,
  };
};
</script>
