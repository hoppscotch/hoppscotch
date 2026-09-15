<template>
  <AiProvidersSettings
    v-if="settings"
    :settings="settings"
    @updated="settings = $event"
  />

  <AiProvidersOverview @show-ai-provider-modal="openCreateModal" />

  <AiProvidersList
    :connections="connections"
    :loading="loading"
    :has-error="hasError"
    :test-results="cardTestResults"
    :testing-ids="testingConnectionIDs"
    @edit-connection="openEditModal"
    @delete-connection="confirmDelete"
    @test-connection="testStoredConnection"
  />

  <AiProvidersConnectionModal
    v-if="showConnectionModal"
    :presets="presets"
    :connection="connectionToEdit"
    :loading="saveActionLoading"
    :testing="modalTesting"
    :test-results="modalTestResults"
    @save-connection="saveConnection"
    @test-connection="testDraftConnection"
    @hide-modal="hideConnectionModal"
  />

  <AiProvidersSkills />

  <HoppSmartConfirmModal
    :show="showDeleteModal"
    :loading-state="deleteActionLoading"
    :title="
      t('state.ai_provider_confirm_delete', {
        label: connectionToDelete?.label,
      })
    "
    @hide-modal="showDeleteModal = false"
    @resolve="deleteConnection"
  />
</template>

<script setup lang="ts">
import { useClientHandle, useMutation } from '@urql/vue';
import { onMounted, ref } from 'vue';
import { useI18n } from '~/composables/i18n';
import { useToast } from '~/composables/toast';
import {
  AiProviderConnectionsDocument,
  AiProviderConnectionsQuery,
  AiProviderPresetsDocument,
  AiProviderPresetsQuery,
  AiSettingsDocument,
  AiSettingsQuery,
  CreateAiProviderConnectionDocument,
  DeleteAiProviderConnectionDocument,
  TestAiProviderConnectionDocument,
  TestAiProviderConnectionMutation,
  UpdateAiProviderConnectionDocument,
} from '~/helpers/backend/graphql';
import { getCompiledErrorMessage } from '~/helpers/errors';
import type {
  ConnectionFormValues,
  ConnectionTestValues,
} from './ConnectionModal.vue';

type Connection = AiProviderConnectionsQuery['aiProviderConnections'][number];
type Preset = AiProviderPresetsQuery['aiProviderPresets'][number];
type Settings = AiSettingsQuery['aiSettings'];
type TestResult =
  TestAiProviderConnectionMutation['testAIProviderConnection'][number];

const t = useI18n();
const toast = useToast();
const { client } = useClientHandle();

const connections = ref<Connection[]>([]);
const presets = ref<Preset[]>([]);
const settings = ref<Settings | null>(null);
const loading = ref(true);
const hasError = ref(false);

const showConnectionModal = ref(false);
const connectionToEdit = ref<Connection | null>(null);
const saveActionLoading = ref(false);

const modalTesting = ref(false);
const modalTestResults = ref<TestResult[] | null>(null);
// A set, not a single id: testing one card while another is still in flight
// would otherwise move the spinner, and the first to return would clear the
// second's. Duplicated connections are exactly what prompts testing two in a row.
const testingConnectionIDs = ref<string[]>([]);
const cardTestResults = ref<Record<string, TestResult[]>>({});

const showDeleteModal = ref(false);
const connectionToDelete = ref<{ id: string; label: string } | null>(null);
const deleteActionLoading = ref(false);

/**
 * Reloads the whole list rather than patching the edited row.
 *
 * A write can change rows it was not addressed to — promoting one connection
 * to default demotes the others, and deleting the default promotes the next —
 * so anything less than a refetch would leave stale badges on screen.
 */
const fetchConnections = async () => {
  loading.value = true;

  const result = await client
    .query(AiProviderConnectionsDocument, {}, { requestPolicy: 'network-only' })
    .toPromise();

  if (result.error || !result.data) {
    hasError.value = true;
  } else {
    connections.value = result.data.aiProviderConnections;
    hasError.value = false;
  }

  loading.value = false;
};

const fetchSettings = async () => {
  const result = await client.query(AiSettingsDocument, {}).toPromise();
  if (!result.error && result.data) settings.value = result.data.aiSettings;
};

const fetchPresets = async () => {
  const result = await client.query(AiProviderPresetsDocument, {}).toPromise();

  if (!result.error && result.data) {
    presets.value = result.data.aiProviderPresets;
  }
};

onMounted(async () => {
  await Promise.all([fetchConnections(), fetchPresets(), fetchSettings()]);
});

const openCreateModal = () => {
  connectionToEdit.value = null;
  // Results belong to the connection that was tested, never to the next one.
  modalTestResults.value = null;
  showConnectionModal.value = true;
};

const openEditModal = (connection: Connection) => {
  connectionToEdit.value = connection;
  modalTestResults.value = null;
  showConnectionModal.value = true;
};

const hideConnectionModal = () => {
  showConnectionModal.value = false;
  connectionToEdit.value = null;
  modalTestResults.value = null;
};

const surfaceMutationError = (message: string, fallback: string) => {
  const compiledErrorMessage = getCompiledErrorMessage(message);
  toast.error(compiledErrorMessage ? t(compiledErrorMessage) : t(fallback));
};

const createMutation = useMutation(CreateAiProviderConnectionDocument);
const updateMutation = useMutation(UpdateAiProviderConnectionDocument);
const deleteMutation = useMutation(DeleteAiProviderConnectionDocument);

const saveConnection = async (values: ConnectionFormValues) => {
  saveActionLoading.value = true;

  const editing = connectionToEdit.value;

  const result = editing
    ? await updateMutation.executeMutation({
        input: {
          id: editing.id,
          label: values.label,
          preset: values.preset,
          baseURL: values.baseURL,
          models: values.models,
          defaultModel: values.defaultModel,
          enabled: values.enabled,
          isDefault: values.isDefault,
          // Omitted rather than sent empty: the stored key cannot be read
          // back, so a blank field has to mean "keep it".
          ...(values.apiKey ? { apiKey: values.apiKey } : {}),
        },
      })
    : await createMutation.executeMutation({
        input: {
          label: values.label,
          preset: values.preset,
          baseURL: values.baseURL,
          apiKey: values.apiKey ?? '',
          models: values.models,
          defaultModel: values.defaultModel,
          enabled: values.enabled,
          isDefault: values.isDefault,
        },
      });

  if (result.error) {
    surfaceMutationError(result.error.message, 'state.something_went_wrong');
  } else {
    toast.success(
      t(
        editing
          ? 'ai_providers.update_success'
          : 'ai_providers.creation_success',
        { label: values.label },
      ),
    );

    // An edit can change the endpoint, the key or the model list, so whatever
    // the last test proved may no longer hold. A stale green tick is worse
    // than no verdict at all.
    if (editing) {
      const { [editing.id]: _stale, ...rest } = cardTestResults.value;
      cardTestResults.value = rest;
    }

    hideConnectionModal();
    await fetchConnections();
  }

  saveActionLoading.value = false;
};

const testMutation = useMutation(TestAiProviderConnectionDocument);

/**
 * Probes the connection as the form currently describes it.
 *
 * Structural validation cannot tell a revoked key or a retired model id from a
 * good one — both are well-formed. This is the only check that can, and it runs
 * before the connection is saved rather than after a user hits it.
 */
const testDraftConnection = async (values: ConnectionTestValues) => {
  modalTesting.value = true;
  modalTestResults.value = null;

  const result = await testMutation.executeMutation({
    input: {
      ...(values.id ? { id: values.id } : {}),
      preset: values.preset,
      baseURL: values.baseURL,
      // Omitted rather than null: that is what tells the server to use the key
      // it already has, which an edit cannot retype.
      ...(values.apiKey ? { apiKey: values.apiKey } : {}),
      models: values.models,
    },
  });

  if (result.error) {
    surfaceMutationError(result.error.message, 'state.something_went_wrong');
  } else {
    modalTestResults.value = result.data!.testAIProviderConnection;
  }

  modalTesting.value = false;
};

/** Re-checks a saved connection, using the key already stored for it. */
const testStoredConnection = async (id: string) => {
  if (testingConnectionIDs.value.includes(id)) return;
  testingConnectionIDs.value = [...testingConnectionIDs.value, id];

  const result = await testMutation.executeMutation({ input: { id } });

  if (result.error) {
    surfaceMutationError(result.error.message, 'state.something_went_wrong');
  } else {
    const results = result.data!.testAIProviderConnection;
    cardTestResults.value = { ...cardTestResults.value, [id]: results };

    const failed = results.filter((r) => !r.ok).length;
    failed
      ? toast.error(
          t('ai_providers.test_some_failed', {
            failed,
            count: results.length,
          }),
        )
      : toast.success(
          t('ai_providers.test_all_passed', { count: results.length }),
        );
  }

  testingConnectionIDs.value = testingConnectionIDs.value.filter(
    (testing) => testing !== id,
  );
};

const confirmDelete = ({ id, label }: { id: string; label: string }) => {
  connectionToDelete.value = { id, label };
  showDeleteModal.value = true;
};

const deleteConnection = async () => {
  if (!connectionToDelete.value) {
    toast.error(t('state.something_went_wrong'));
    return;
  }

  const { id, label } = connectionToDelete.value;

  deleteActionLoading.value = true;

  const result = await deleteMutation.executeMutation({ id });

  if (result.error) {
    surfaceMutationError(result.error.message, 'state.something_went_wrong');
  } else {
    toast.success(t('ai_providers.deletion_success', { label }));
    const { [id]: _removed, ...rest } = cardTestResults.value;
    cardTestResults.value = rest;
    await fetchConnections();
  }

  deleteActionLoading.value = false;
  showDeleteModal.value = false;
  connectionToDelete.value = null;
};
</script>
