<template>
  <div class="flex flex-1">
    <SmartIntersection
      class="flex flex-1 flex-col"
      @intersecting="onTeamSelectIntersect"
    >
      <tippy
        interactive
        trigger="click"
        theme="popover"
        placement="bottom"
        :on-shown="() => tippyActions!.focus()"
      >
        <span
          v-tippy="{ theme: 'tooltip' }"
          :title="`${t('collection.select_team')}`"
          class="bg-transparent border-b border-dividerLight select-wrapper"
        >
          <ButtonSecondary
            v-if="collectionsType.selectedTeam"
            :icon="IconUsers"
            :label="collectionsType.selectedTeam.name"
            class="flex-1 !justify-start pr-8 rounded-none"
          />
          <ButtonSecondary
            v-else
            :label="`${t('collection.select_team')}`"
            class="flex-1 !justify-start pr-8 rounded-none"
          />
        </span>
        <template #content="{ hide }">
          <div
            ref="tippyActions"
            class="flex flex-col focus:outline-none"
            tabindex="0"
            @keyup.escape="hide()"
          >
            <div
              v-if="isTeamListLoading && myTeams.length === 0"
              class="flex flex-col flex-1 items-center justify-center p-2"
            >
              <SmartSpinner class="my-2" />
              <span class="text-secondaryLight">{{ t("state.loading") }}</span>
            </div>
            <div v-else class="flex flex-col">
              <SmartItem
                v-for="(team, index) in myTeams"
                :key="`team-${index}`"
                :label="team.name"
                :info-icon="
                  team.id === collectionsType.selectedTeam?.id
                    ? IconDone
                    : undefined
                "
                :active-info-icon="team.id === collectionsType.selectedTeam?.id"
                :icon="IconUsers"
                @click="
                  () => {
                    updateSelectedTeam(team)
                    hide()
                  }
                "
              />
            </div>
          </div>
        </template>
      </tippy>
    </SmartIntersection>
  </div>
</template>

<script setup lang="ts">
import IconUsers from "~icons/lucide/users"
import IconDone from "~icons/lucide/check"
import { PropType, ref } from "vue"
import { GetMyTeamsQuery } from "~/helpers/backend/graphql"
import { TippyComponent } from "vue-tippy"
import { useI18n } from "@composables/i18n"

const t = useI18n()

type SelectedTeam = GetMyTeamsQuery["myTeams"][number] | undefined

type CollectionType =
  | {
      type: "team-collections"
      selectedTeam: SelectedTeam
    }
  | { type: "my-collections"; selectedTeam: undefined }

defineProps({
  collectionsType: {
    type: Object as PropType<CollectionType>,
    default: () => ({ type: "my-collections", selectedTeam: undefined }),
    required: true,
  },
  myTeams: {
    type: Array as PropType<GetMyTeamsQuery["myTeams"]>,
    default: () => [],
    required: true,
  },
  isTeamListLoading: {
    type: Boolean,
    default: false,
    required: true,
  },
})

const tippyActions = ref<TippyComponent | null>(null)

const emit = defineEmits<{
  (e: "update-selected-team", payload: SelectedTeam): void
  (e: "team-select-intersect", payload: boolean): void
}>()

const updateSelectedTeam = (team: SelectedTeam) => {
  emit("update-selected-team", team)
}

const onTeamSelectIntersect = () => {
  emit("team-select-intersect", true)
}
</script>
