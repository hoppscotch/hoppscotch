<template>
  <div>
    <div class="sticky top-0 z-10 flex flex-col rounded-t bg-primary">
      <tippy ref="options" interactive trigger="click" theme="popover" arrow>
        <template #trigger>
          <span
            v-tippy="{ theme: 'tooltip' }"
            :title="`${$t('environment.select')}`"
            class="flex-1 bg-transparent border-b border-dividerLight select-wrapper"
          >
            <ButtonSecondary
              v-if="selectedEnvironmentIndex !== -1"
              :label="environments[selectedEnvironmentIndex].name"
              class="flex-1 !justify-start pr-8 rounded-none"
            />
            <ButtonSecondary
              v-else
              :label="`${$t('environment.select')}`"
              class="flex-1 !justify-start pr-8 rounded-none"
            />
          </span>
        </template>
        <div class="flex flex-col" role="menu">
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
          <hr />
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
        </div>
      </tippy>
      <div class="flex justify-between flex-1 border-b border-dividerLight">
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
      class="flex flex-col items-center justify-center p-4 text-secondaryLight"
    >
      <img
        :src="`/images/states/${$colorMode.value}/blockchain.svg`"
        loading="lazy"
        class="inline-flex flex-col object-contain object-center w-16 h-16 my-4"
        :alt="`${$t('empty.environments')}`"
      />
      <span class="pb-4 text-center">
        {{ $t("empty.environments") }}
      </span>
      <ButtonSecondary
        :label="`${$t('add.new')}`"
        filled
        class="mb-4"
        @click.native="displayModalAdd(true)"
      />
    </div>
    <EnvironmentsDetails
      :show="showModalDetails"
      :action="action"
      :editing-environment-index="editingEnvironmentIndex"
      @hide-modal="displayModalEdit(false)"
    />
    <EnvironmentsImportExport
      :show="showModalImportExport"
      @hide-modal="displayModalImportExport(false)"
    />
  </div>
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
      showModalDetails: false,
      action: "edit" as "new" | "edit",
      editingEnvironmentIndex: undefined as number | "Global" | undefined,
    }
  },
  methods: {
    displayModalAdd(shouldDisplay: boolean) {
      this.action = "new"
      this.showModalDetails = shouldDisplay
    },
    displayModalEdit(shouldDisplay: boolean) {
      this.action = "edit"
      this.showModalDetails = shouldDisplay

      if (!shouldDisplay) this.resetSelectedData()
    },
    displayModalImportExport(shouldDisplay: boolean) {
      this.showModalImportExport = shouldDisplay
    },
    editEnvironment(environmentIndex: number | "Global") {
      this.$data.editingEnvironmentIndex = environmentIndex
      this.action = "edit"
      this.displayModalEdit(true)
    },
    resetSelectedData() {
      this.$data.editingEnvironmentIndex = undefined
    },
  },
})
</script>
