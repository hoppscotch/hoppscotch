<template>
  <div class="px-4 pt-4 pb-8 space-y-4">
    <div class="space-y-1">
      <h4 class="font-bold text-secondaryDark heading">
        {{ t('ai_providers.skills_title') }}
      </h4>
      <p class="text-secondaryLight">
        {{ t('ai_providers.skills_description') }}
      </p>
    </div>

    <HoppButtonSecondary
      filled
      outline
      :label="t('ai_providers.skill_add')"
      @click="openCreate"
    />

    <div v-if="loading" class="flex flex-col items-center py-3">
      <HoppSmartSpinner />
    </div>

    <p v-else-if="!skills.length" class="text-tiny text-secondaryLight">
      {{ t('ai_providers.skills_empty') }}
    </p>

    <div v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="skill in skills"
        :key="skill.id"
        class="flex flex-col gap-2 p-3 border rounded border-divider min-w-0 sm:h-40"
      >
        <div class="flex min-w-0 items-start justify-between gap-2">
          <span
            class="min-w-0 truncate text-sm font-semibold text-secondaryDark"
            :title="`/${skill.slug}`"
            >/{{ skill.slug }}</span
          >
          <span
            v-if="!skill.enabled"
            class="shrink-0 px-2 py-0.5 text-tiny rounded border border-divider text-secondaryLight"
          >
            {{ t('ai_providers.disabled_badge') }}
          </span>
        </div>

        <div
          class="truncate text-tiny text-secondaryLight"
          :title="skill.title"
        >
          {{ skill.title }}
        </div>
        <p
          class="[overflow-wrap:anywhere] text-tiny text-secondaryLight line-clamp-2"
          :title="skill.description"
        >
          {{ skill.description }}
        </p>

        <div class="mt-auto flex flex-wrap items-center gap-2 pt-1">
          <HoppButtonSecondary
            :label="t('action.edit')"
            filled
            outline
            @click="openEdit(skill)"
          />
          <HoppButtonSecondary
            :label="t('action.delete')"
            filled
            outline
            @click="confirmDelete(skill)"
          />
        </div>
      </div>
    </div>

    <AiProvidersSkillModal
      v-if="showModal"
      :skill="skillToEdit"
      :loading="saving"
      @save-skill="saveSkill"
      @hide-modal="hideModal"
    />

    <HoppSmartConfirmModal
      :show="showDeleteModal"
      :loading-state="deleting"
      :title="t('state.ai_skill_confirm_delete', { slug: skillToDelete?.slug })"
      @hide-modal="showDeleteModal = false"
      @resolve="deleteSkill"
    />
  </div>
</template>

<script setup lang="ts">
import { useClientHandle, useMutation } from '@urql/vue';
import { onMounted, ref } from 'vue';
import { useI18n } from '~/composables/i18n';
import { useToast } from '~/composables/toast';
import {
  AiSkillsDocument,
  AiSkillsQuery,
  CreateAiSkillDocument,
  DeleteAiSkillDocument,
  UpdateAiSkillDocument,
} from '~/helpers/backend/graphql';
import { getCompiledErrorMessage } from '~/helpers/errors';
import type { SkillFormValues } from './SkillModal.vue';

type Skill = AiSkillsQuery['aiSkills'][number];

const t = useI18n();
const toast = useToast();
const { client } = useClientHandle();

const skills = ref<Skill[]>([]);
const loading = ref(true);

const showModal = ref(false);
const skillToEdit = ref<Skill | null>(null);
const saving = ref(false);

const showDeleteModal = ref(false);
const skillToDelete = ref<Skill | null>(null);
const deleting = ref(false);

const fetchSkills = async () => {
  loading.value = true;
  const result = await client
    .query(AiSkillsDocument, {}, { requestPolicy: 'network-only' })
    .toPromise();
  if (!result.error && result.data) skills.value = result.data.aiSkills;
  loading.value = false;
};

onMounted(fetchSkills);

const openCreate = () => {
  skillToEdit.value = null;
  showModal.value = true;
};

const openEdit = (skill: Skill) => {
  skillToEdit.value = skill;
  showModal.value = true;
};

const hideModal = () => {
  showModal.value = false;
  skillToEdit.value = null;
};

const surfaceError = (message: string, fallback: string) => {
  const compiled = getCompiledErrorMessage(message);
  toast.error(compiled ? t(compiled) : t(fallback));
};

const createMutation = useMutation(CreateAiSkillDocument);
const updateMutation = useMutation(UpdateAiSkillDocument);
const deleteMutation = useMutation(DeleteAiSkillDocument);

const saveSkill = async (values: SkillFormValues) => {
  saving.value = true;

  const result = values.id
    ? await updateMutation.executeMutation({
        input: { ...values, id: values.id },
      })
    : await createMutation.executeMutation({
        input: {
          slug: values.slug,
          title: values.title,
          description: values.description,
          prompt: values.prompt,
          enabled: values.enabled,
        },
      });

  if (result.error) {
    surfaceError(result.error.message, 'state.something_went_wrong');
  } else {
    toast.success(
      t(
        values.id ? 'ai_providers.skill_updated' : 'ai_providers.skill_created',
        { slug: values.slug },
      ),
    );
    hideModal();
    await fetchSkills();
  }

  saving.value = false;
};

const confirmDelete = (skill: Skill) => {
  skillToDelete.value = skill;
  showDeleteModal.value = true;
};

const deleteSkill = async () => {
  if (!skillToDelete.value) return;

  deleting.value = true;
  const { id, slug } = skillToDelete.value;
  const result = await deleteMutation.executeMutation({ id });

  if (result.error) {
    surfaceError(result.error.message, 'state.something_went_wrong');
  } else {
    toast.success(t('ai_providers.skill_deleted', { slug }));
    await fetchSkills();
  }

  deleting.value = false;
  showDeleteModal.value = false;
  skillToDelete.value = null;
};
</script>
