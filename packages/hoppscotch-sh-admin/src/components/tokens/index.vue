<template>
  <TokensOverview
    @show-infra-tokens-generate-modal="showInfraTokensGenerateModal = true"
  />

  <TokensList
    :infra-tokens="infraTokens"
    :has-error="tokensListFetchErrored"
    :has-more-tokens="hasMoreTokens"
    :loading="tokensListLoading"
    @delete-infra-token="displayDeleteInfraTokenConfirmationModal"
    @fetch-more-tokens="fetchInfraTokens"
  />

  <TokensGenerateModal
    v-if="showInfraTokensGenerateModal"
    :infra-token="infraToken"
    :token-generate-action-loading="tokenGenerateActionLoading"
    @generate-infra-token="generateInfraToken"
    @hide-modal="hideInfraTokenGenerateModal"
  />

  <HoppSmartConfirmModal
    :show="confirmDeleteInfraToken"
    :loading-state="tokenDeleteActionLoading"
    :title="
      t('state.confirm_delete_access_token', {
        tokenLabel: tokenToDelete?.label,
      })
    "
    @hide-modal="confirmDeleteInfraToken = false"
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

const t = useI18n();
const toast = useToast();

const confirmDeleteInfraToken = ref(false);
const hasMoreTokens = ref(false);
const showInfraTokensGenerateModal = ref(false);
const tokenDeleteActionLoading = ref(false);
const tokenGenerateActionLoading = ref(false);

const infraToken: Ref<string | null> = ref(null);
const tokenToDelete = ref<{ id: string; label: string } | null>(null);

const infraTokens: Ref<InfraTokensQuery['infraTokens']> = ref([]);

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
  await fetchInfraTokens();
});

const fetchInfraTokens = async () => {
  infraTokens.value.push(...tokensList.value);

  if (tokensList.value.length > 0) {
    offset += tokensList.value.length;
  }

  hasMoreTokens.value = tokensList.value.length === limit;
};

const createInfraTokens = useMutation(CreateInfraTokenDocument);

const generateInfraToken = async ({
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
    showInfraTokensGenerateModal.value = false;
  } else {
    infraTokens.value.unshift(result.data!.createInfraToken.info);
    infraToken.value = result.data!.createInfraToken.token;
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
    infraTokens.value = infraTokens.value.filter(
      (token) => token.id !== tokenIdToDelete
    );

    offset = offset > 0 ? offset - 1 : offset;

    toast.success(
      t('infra_tokens.deletion_success', { label: tokenLabelToDelete })
    );

    if (tokensListFetchErrored.value) {
      tokensListFetchErrored.value = false;
    }
  }

  tokenDeleteActionLoading.value = false;
  confirmDeleteInfraToken.value = false;
  tokenToDelete.value = null;
};

const hideInfraTokenGenerateModal = () => {
  // Reset the reactive state variable holding access token value and hide the modal
  infraToken.value = null;
  showInfraTokensGenerateModal.value = false;
};

const displayDeleteInfraTokenConfirmationModal = ({
  tokenId,
  tokenLabel,
}: {
  tokenId: string;
  tokenLabel: string;
}) => {
  confirmDeleteInfraToken.value = true;

  tokenToDelete.value = {
    id: tokenId,
    label: tokenLabel,
  };
};
</script>
