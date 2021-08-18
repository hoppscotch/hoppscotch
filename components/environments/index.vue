<template>
  <AppSection :label="$t('environment.title')">
    <div
      class="
        bg-primary
        rounded-t
        flex flex-col
        top-sidebarPrimaryStickyFold
        z-10
        sticky
      "
    >
      <div class="select-wrapper">
        <select
          v-model="selectedEnvironmentIndex"
          :disabled="environments.length == 0"
          class="
            bg-primaryLight
            border-b border-dividerLight
            flex
            w-full
            py-2
            px-4
            appearance-none
          "
        >
          <option :value="-1">{{ $t("environment.no_environment") }}</option>
          <option v-if="environments.length === 0" value="0">
            {{ $t("environment.create_new") }}
          </option>
          <option
            v-for="(environment, index) in environments"
            :key="`environment-${index}`"
            :value="index"
          >
            {{ environment.name }}
          </option>
        </select>
      </div>
      <div class="border-b border-dividerLight flex flex-1 justify-between">
        <ButtonSecondary
          icon="add"
          :label="$t('new')"
          class="rounded-none"
          @click.native="displayModalAdd(true)"
        />
        <div class="flex">
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            to="https://docs.hoppscotch.io/"
            blank
            :title="$t('wiki')"
            icon="help_outline"
          />
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            icon="import_export"
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
        environment-index="global"
        :environment="globalEnvironment"
        class="border-b border-dashed border-dividerLight"
        @edit-environment="editEnvironment('global')"
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
      <span class="text-center pb-4">
        {{ $t("empty.environments") }}
      </span>
      <ButtonSecondary
        :label="$t('add.new')"
        outline
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
      editingEnvironmentIndex: undefined as number | "global" | undefined,
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
    editEnvironment(environmentIndex: number | "global") {
      this.$data.editingEnvironmentIndex = environmentIndex
      this.displayModalEdit(true)
    },
    resetSelectedData() {
      this.$data.editingEnvironmentIndex = undefined
    },
  },
})
</script>
