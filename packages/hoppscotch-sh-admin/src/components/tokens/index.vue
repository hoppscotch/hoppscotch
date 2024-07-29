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
    @fetch-more-tokens="fetchMoreInfraTokens"
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
      t('state.confirm_delete_infra_token', {
        tokenLabel: tokenToDelete?.label,
      })
    "
    @hide-modal="confirmDeleteInfraToken = false"
    @resolve="deleteInfraToken"
  />
</template>

<script setup lang="ts">
import { useMutation } from '@urql/vue';
import { Ref, ref, watch } from 'vue';
import { useI18n } from '~/composables/i18n';
import { useToast } from '~/composables/toast';
import { usePagedQuery } from '~/composables/usePagedQuery';
import {
  CreateInfraTokenDocument,
  InfraTokensDocument,
  InfraTokensQuery,
  RevokeInfraTokenDocument,
} from '~/helpers/backend/graphql';
import { getCompiledErrorMessage } from '~/helpers/errors';

const t = useI18n();
const toast = useToast();

const confirmDeleteInfraToken = ref(false);
const hasMoreTokens = ref(false);
const showInfraTokensGenerateModal = ref(false);
const tokenDeleteActionLoading = ref(false);
const tokenGenerateActionLoading = ref(false);
const tokenToDelete = ref<{ id: string; label: string } | null>(null);

const infraToken: Ref<string | null> = ref(null);
const infraTokens: Ref<InfraTokensQuery['infraTokens']> = ref([]);

let offset = 0;
const tokensPerPage = 12;

const {
  fetching: tokensListLoading,
  error: tokensListFetchErrored,
  list: tokensList,
  refetch,
} = usePagedQuery(InfraTokensDocument, (x) => x.infraTokens, tokensPerPage, {
  skip: offset,
  take: tokensPerPage,
});

const fetchMoreInfraTokens = async () =>
  await refetch({ skip: offset, take: tokensPerPage });

// Update the infraTokens list whenever tokensList is fetched
watch(tokensListLoading, (fetching) => {
  if (fetching) return;
  else {
    infraTokens.value.push(...tokensList.value);
    if (tokensList.value.length > 0) offset += tokensList.value.length;
    hasMoreTokens.value = tokensList.value.length === tokensPerPage;
  }
});

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
    const { message } = result.error;
    const compiledErrorMessage = getCompiledErrorMessage(message);

    compiledErrorMessage
      ? toast.error(t(compiledErrorMessage))
      : toast.error(t('state.generate_infra_token_failure'));

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
    toast.error(t('state.something_went_wrong'));
    return;
  }

  const { id: tokenIdToDelete, label: tokenLabelToDelete } =
    tokenToDelete.value;

  tokenDeleteActionLoading.value = true;

  const result = await revokeInfraToken.executeMutation({
    id: tokenIdToDelete,
  });

  if (result.error) {
    toast.error(t('state.delete_infra_token_failure'));
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
  // Reset the reactive state variable holding infra token value and hide the modal
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
