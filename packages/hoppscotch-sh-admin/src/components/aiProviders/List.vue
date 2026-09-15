<template>
  <div class="flex flex-col px-4">
    <div v-if="loading" class="flex flex-col items-center py-3">
      <HoppSmartSpinner />
    </div>

    <div v-else-if="hasError" class="flex flex-col items-center py-4">
      <icon-lucide-help-circle class="mb-4 svg-icons" />
      {{ t('state.something_went_wrong') }}
    </div>

    <HoppSmartPlaceholder
      v-else-if="connections.length === 0"
      :src="noConnectionsImage"
      :alt="`${t('ai_providers.empty')}`"
      :text="t('ai_providers.empty')"
      @drop.stop
    />

    <div v-else class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="connection in connections"
        :key="connection.id"
        class="flex flex-col gap-4 p-4 border rounded border-divider min-w-0"
      >
        <div class="flex items-start justify-between gap-x-2">
          <div class="flex min-w-0 items-start gap-2.5">
            <component
              :is="logoForPreset(connection.preset)"
              class="mt-0.5 h-5 w-5 shrink-0 text-secondaryDark"
              aria-hidden="true"
            />
            <div class="min-w-0 space-y-1">
              <div
                class="text-sm font-semibold truncate text-secondaryDark"
                :title="connection.label"
              >
                {{ connection.label }}
              </div>
              <div class="text-tiny text-secondaryLight">
                {{ labelForPreset(connection.preset) }}
              </div>
            </div>
          </div>

          <div class="flex flex-wrap justify-end gap-1 shrink-0">
            <span
              v-if="connection.isDefault"
              class="px-2 py-0.5 text-tiny rounded border border-divider text-secondaryDark"
            >
              {{ t('ai_providers.default_badge') }}
            </span>
            <span
              v-if="!connection.enabled"
              class="px-2 py-0.5 text-tiny rounded border border-divider text-secondaryLight"
            >
              {{ t('ai_providers.disabled_badge') }}
            </span>
          </div>
        </div>

        <div class="space-y-1 text-secondaryLight">
          <div class="space-x-1">
            <span class="font-semibold"
              >{{ t('ai_providers.default_model') }}:</span
            >
            <span class="break-all">{{ connection.defaultModel }}</span>
          </div>

          <div
            v-if="connection.models.length > 1"
            class="space-x-1"
            :title="connection.models.join(', ')"
          >
            <span class="font-semibold">{{ t('ai_providers.models') }}:</span>
            <span>{{ connection.models.length }}</span>
          </div>

          <div
            v-if="connection.baseURL"
            class="truncate"
            :title="connection.baseURL"
          >
            {{ connection.baseURL }}
          </div>

          <div>
            {{
              connection.hasApiKey
                ? t('ai_providers.key_stored')
                : t('ai_providers.no_key')
            }}
          </div>
        </div>

        <div v-if="testResults[connection.id]" class="space-y-1">
          <div
            class="flex items-start gap-1.5 text-tiny"
            :class="
              failedFor(connection.id) ? 'text-red-500' : 'text-green-500'
            "
          >
            <icon-lucide-check
              v-if="!failedFor(connection.id)"
              class="mt-0.5 h-3 w-3 shrink-0"
            />
            <icon-lucide-x v-else class="mt-0.5 h-3 w-3 shrink-0" />
            <span>
              {{
                failedFor(connection.id)
                  ? t('ai_providers.test_some_failed', {
                      failed: failedFor(connection.id),
                      count: testResults[connection.id].length,
                    })
                  : t('ai_providers.test_all_passed', {
                      count: testResults[connection.id].length,
                    })
              }}
            </span>
          </div>

          <div
            v-for="failure in shownFailures(connection.id)"
            :key="failure.model"
            class="pl-[1.125rem] text-tiny text-secondaryLight"
          >
            <span class="break-all">{{ failure.model }}</span>
            —
            {{ t(`ai_providers.test_reason_${failure.reason ?? 'unknown'}`) }}
          </div>
          <div
            v-if="hiddenFailureCount(connection.id)"
            class="pl-[1.125rem] text-tiny text-secondaryLight"
          >
            {{
              t('ai_providers.test_more_failures', {
                count: hiddenFailureCount(connection.id),
              })
            }}
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-end gap-2">
          <HoppButtonSecondary
            :loading="testingIds.includes(connection.id)"
            :label="t('ai_providers.test_connection')"
            filled
            outline
            @click="emit('test-connection', connection.id)"
          />
          <HoppButtonSecondary
            :label="t('action.edit')"
            filled
            outline
            @click="emit('edit-connection', connection)"
          />
          <HoppButtonSecondary
            :label="t('action.delete')"
            filled
            outline
            @click="
              emit('delete-connection', {
                id: connection.id,
                label: connection.label,
              })
            "
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '~/composables/i18n';
import { labelForPreset, logoForPreset } from '~/helpers/aiProviderLogos';
import {
  AiProviderConnectionsQuery,
  TestAiProviderConnectionMutation,
} from '~/helpers/backend/graphql';

type Connection = AiProviderConnectionsQuery['aiProviderConnections'][number];
type TestResult =
  TestAiProviderConnectionMutation['testAIProviderConnection'][number];

const t = useI18n();

const props = defineProps<{
  connections: Connection[];
  loading: boolean;
  hasError: boolean;
  /** Results of the last test per connection; absent until one is run. */
  testResults: Record<string, TestResult[]>;
  testingIds: string[];
}>();

const emit = defineEmits<{
  (e: 'edit-connection', connection: Connection): void;
  (e: 'delete-connection', { id, label }: { id: string; label: string }): void;
  (e: 'test-connection', id: string): void;
}>();

const noConnectionsImage = `${import.meta.env.VITE_ADMIN_URL}/images/pack.svg`;

const failedFor = (id: string) =>
  (props.testResults[id] ?? []).filter((r) => !r.ok).length;

const MAX_SHOWN_FAILURES = 3;

const shownFailures = (id: string) =>
  (props.testResults[id] ?? [])
    .filter((r) => !r.ok)
    .slice(0, MAX_SHOWN_FAILURES);

const hiddenFailureCount = (id: string) =>
  Math.max(0, failedFor(id) - MAX_SHOWN_FAILURES);
</script>
