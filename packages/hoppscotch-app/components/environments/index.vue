<template>
  <AppSection :label="`${$t('environment.title')}`">
    <div class="bg-primary rounded-t flex flex-col top-0 z-10 sticky">
      <tippy ref="options" interactive trigger="click" theme="popover" arrow>
        <template #trigger>
          <span
            v-tippy="{ theme: 'tooltip' }"
            :title="`${$t('environment.select')}`"
            class="
              bg-transparent
              border-b border-dividerLight
              flex-1
              select-wrapper
            "
          >
            <ButtonSecondary
              v-if="selectedEnvironmentIndex !== -1"
              :label="environments[selectedEnvironmentIndex].name"
              class="rounded-none flex-1 pr-8"
            />
            <ButtonSecondary
              v-else
              :label="`${$t('environment.no_environment')}`"
              class="rounded-none flex-1 pr-8"
            />
          </span>
        </template>
        <SmartItem
          :label="`${$t('environment.no_environment')}`"
          :info-icon="selectedEnvironmentIndex === -1 ? 'done' : ''"
          :active-info-icon="selectedEnvironmentIndex === -1"
          @click.native="
            () => {
              selectedEnvironmentIndex = -1
              $refs.options.tippy().hide()
            }
          "
        />
        <SmartItem
          v-for="(gen, index) in environments"
          :key="`gen-${index}`"
          :label="gen.name"
          :info-icon="index === selectedEnvironmentIndex ? 'done' : ''"
          :active-info-icon="index === selectedEnvironmentIndex"
          @click.native="
            () => {
              selectedEnvironmentIndex = index
              $refs.options.tippy().hide()
            }
          "
        />
      </tippy>
      <div class="border-b border-dividerLight flex flex-1 justify-between">
        <ButtonSecondary
          svg="plus"
          :label="`${$t('action.new')}`"
          class="!rounded-none"
          @click.native="displayModalAdd(true)"
        />
        <div class="flex">
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            to="https://docs.hoppscotch.io/features/environments"
            blank
            :title="$t('app.wiki')"
            svg="help-circle"
          />
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            svg="archive"
            :title="$t('modal.import_export')"
            @click.native="displayModalImportExport(true)"
          />
        </div>
      </div>
    </div>
    <EnvironmentsAdd
      :show="showModalAdd"
      @hide-modal="displayModalAdd(false)"
    />
    <EnvironmentsEdit
      :show="showModalEdit"
      :editing-environment-index="editingEnvironmentIndex"
      @hide-modal="displayModalEdit(false)"
    />
    <EnvironmentsImportExport
      :show="showModalImportExport"
      @hide-modal="displayModalImportExport(false)"
    />
    <div class="flex flex-col">
      <EnvironmentsEnvironment
        environment-index="Global"
        :environment="globalEnvironment"
        class="border-b border-dashed border-dividerLight"
        @edit-environment="editEnvironment('Global')"
      />
      <EnvironmentsEnvironment
        v-for="(environment, index) in environments"
        :key="`environment-${index}`"
        :environment-index="index"
        :environment="environment"
        @edit-environment="editEnvironment(index)"
      />
    </div>
    <div
      v-if="environments.length === 0"
      class="flex flex-col text-secondaryLight p-4 items-center justify-center"
    >
      <img
        :src="`/images/states/${$colorMode.value}/blockchain.svg`"
        loading="lazy"
        class="flex-col my-4 object-contain object-center h-16 w-16 inline-flex"
        :alt="$t('empty.environments')"
      />
      <span class="text-center pb-4">
        {{ $t("empty.environments") }}
      </span>
      <ButtonSecondary
        :label="`${$t('add.new')}`"
        filled
        class="mb-4"
        @click.native="displayModalAdd(true)"
      />
    </div>
  </AppSection>
</template>

<script lang="ts">
import { computed, defineComponent } from "@nuxtjs/composition-api"
import { useReadonlyStream, useStream } from "~/helpers/utils/composables"
import {
  environments$,
  setCurrentEnvironment,
  selectedEnvIndex$,
  globalEnv$,
} from "~/newstore/environments"

export default defineComponent({
  setup() {
    const globalEnv = useReadonlyStream(globalEnv$, [])

    const globalEnvironment = computed(() => ({
      name: "Global",
      variables: globalEnv.value,
    }))

    return {
      environments: useReadonlyStream(environments$, []),
      globalEnvironment,
      selectedEnvironmentIndex: useStream(
        selectedEnvIndex$,
        -1,
        setCurrentEnvironment
      ),
    }
  },
  data() {
    return {
      showModalImportExport: false,
      showModalAdd: false,
      showModalEdit: false,
      editingEnvironmentIndex: undefined as number | "Global" | undefined,
    }
  },
  methods: {
    displayModalAdd(shouldDisplay: boolean) {
      this.showModalAdd = shouldDisplay
    },
    displayModalEdit(shouldDisplay: boolean) {
      this.showModalEdit = shouldDisplay

      if (!shouldDisplay) this.resetSelectedData()
    },
    displayModalImportExport(shouldDisplay: boolean) {
      this.showModalImportExport = shouldDisplay
    },
    editEnvironment(environmentIndex: number | "Global") {
      this.$data.editingEnvironmentIndex = environmentIndex
      this.displayModalEdit(true)
    },
    resetSelectedData() {
      this.$data.editingEnvironmentIndex = undefined
    },
  },
})
</script>
