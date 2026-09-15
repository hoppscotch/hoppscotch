<template>
  <div class="px-4 pt-8 pb-4 space-y-4">
    <div class="space-y-1">
      <h4 class="font-bold text-secondaryDark heading">
        {{ t('ai_providers.settings_title') }}
      </h4>
      <p class="text-secondaryLight">
        {{ t('ai_providers.settings_description') }}
      </p>
    </div>

    <HoppSmartToggle :on="settings.enabled" @change="toggleEnabled">
      {{ t('ai_providers.enable_assistant') }}
    </HoppSmartToggle>

    <UiAccordion
      v-if="settings.enabled"
      :title="'ai_providers.advanced_title'"
      :description="'ai_providers.advanced_description'"
    >
      <div class="grid gap-x-4 gap-y-2 pt-4 sm:grid-cols-2 max-w-2xl">
        <div class="flex flex-col space-y-2">
          <label>{{ t('ai_providers.timeout_ms') }}</label>
          <HoppSmartInput
            v-model="timeoutInput"
            type="number"
            placeholder="e.g., 600000"
            class="!my-2 !bg-primaryLight"
          />
        </div>

        <div class="flex flex-col space-y-2">
          <label>{{ t('ai_providers.max_retries') }}</label>
          <HoppSmartInput
            v-model="retriesInput"
            type="number"
            placeholder="e.g., 2"
            class="!my-2 !bg-primaryLight"
          />
        </div>

        <div class="flex flex-col space-y-2">
          <label>{{ t('ai_providers.reasoning_effort') }}</label>
          <HoppSmartInput
            v-model="reasoningInput"
            placeholder="e.g., none"
            class="!my-2 !bg-primaryLight"
          />
          <p class="text-tiny text-secondaryLight">
            {{ t('ai_providers.reasoning_effort_help') }}
          </p>
        </div>
      </div>

      <!-- Three states, not two: most presets declare their capabilities from
           vendor documentation, so "follow the provider" has to stay reachable. -->
      <div class="grid gap-x-4 gap-y-2 pt-5 sm:grid-cols-2 max-w-2xl">
        <div class="flex flex-col space-y-2">
          <label>{{ t('ai_providers.tool_search') }}</label>
          <AiProvidersOverrideSelect
            :model-value="toolSearchInput"
            @update:model-value="toolSearchInput = $event"
          />
        </div>

        <div class="flex flex-col space-y-2">
          <label>{{ t('ai_providers.prompt_caching') }}</label>
          <AiProvidersOverrideSelect
            :model-value="promptCachingInput"
            @update:model-value="promptCachingInput = $event"
          />
        </div>
      </div>

      <div class="pt-6">
        <HoppButtonPrimary
          :loading="saving"
          :label="t('action.save')"
          filled
          outline
          @click="saveTuning"
        />
      </div>
    </UiAccordion>
  </div>
</template>

<script setup lang="ts">
import { useMutation } from '@urql/vue';
import { ref, watch } from 'vue';
import { useI18n } from '~/composables/i18n';
import { useToast } from '~/composables/toast';
import {
  AiSettingsQuery,
  UpdateAiSettingsDocument,
} from '~/helpers/backend/graphql';
import { getCompiledErrorMessage } from '~/helpers/errors';

type Settings = AiSettingsQuery['aiSettings'];

const t = useI18n();
const toast = useToast();

const props = defineProps<{ settings: Settings }>();
const emit = defineEmits<{ (e: 'updated', settings: Settings): void }>();

const saving = ref(false);

// Blank means "unset", which is what clears the override server-side.
const asText = (value: number | null | undefined) =>
  value === null || value === undefined ? '' : String(value);

const timeoutInput = ref(asText(props.settings.timeoutMs));
const retriesInput = ref(asText(props.settings.maxRetries));
const reasoningInput = ref(props.settings.reasoningEffort ?? '');
const toolSearchInput = ref<boolean | null>(props.settings.toolSearch ?? null);
const promptCachingInput = ref<boolean | null>(
  props.settings.promptCaching ?? null,
);

// A save elsewhere in the tab (the toggle) re-reads the row; follow it.
watch(
  () => props.settings,
  (next) => {
    timeoutInput.value = asText(next.timeoutMs);
    retriesInput.value = asText(next.maxRetries);
    reasoningInput.value = next.reasoningEffort ?? '';
    toolSearchInput.value = next.toolSearch ?? null;
    promptCachingInput.value = next.promptCaching ?? null;
  },
);

const updateMutation = useMutation(UpdateAiSettingsDocument);

// A number input can hand back an actual number despite the declared string
// type, so this coerces rather than assuming — the same defence
// `isNotValidNumber` in helpers/configs.ts makes for the infra config fields.
const asNumber = (value: string | number) => {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const save = async (input: Record<string, unknown>) => {
  saving.value = true;

  const result = await updateMutation.executeMutation({ input });

  if (result.error) {
    const compiled = getCompiledErrorMessage(result.error.message);
    toast.error(compiled ? t(compiled) : t('state.something_went_wrong'));
  } else {
    emit('updated', result.data!.updateAISettings);
    toast.success(t('ai_providers.settings_saved'));
  }

  saving.value = false;
};

// The toggle saves on its own: it is the one control an admin flips and walks
// away from, and burying it behind a Save button invites a half-applied state.
const toggleEnabled = () => save({ enabled: !props.settings.enabled });

const saveTuning = () =>
  save({
    timeoutMs: asNumber(timeoutInput.value),
    maxRetries: asNumber(retriesInput.value),
    reasoningEffort: String(reasoningInput.value ?? '').trim() || null,
    toolSearch: toolSearchInput.value,
    promptCaching: promptCachingInput.value,
  });
</script>
