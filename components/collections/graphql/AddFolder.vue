<template>
  <SmartModal v-if="show" @close="$emit('hide-modal')">
    <template #header>
      <h3 class="heading">{{ $t("new_folder") }}</h3>
      <div>
        <ButtonSecondary icon="close" @click.native="hideModal" />
      </div>
    </template>
    <template #body>
      <div class="flex flex-col px-2">
        <label for="selectLabelGqlAddFolder" class="font-semibold px-4 pb-4">
          {{ $t("label") }}
        </label>
        <input
          id="selectLabelGqlAddFolder"
          v-model="name"
          class="input"
          type="text"
          :placeholder="$t('folder.new')"
          @keyup.enter="addFolder"
        />
      </div>
    </template>
    <template #footer>
      <span>
        <ButtonPrimary :label="$t('save')" @click.native="addFolder" />
        <ButtonSecondary :label="$t('cancel')" @click.native="hideModal" />
      </span>
    </template>
  </SmartModal>
</template>

<script lang="ts">
import Vue from "vue"

export default Vue.extend({
  props: {
    show: Boolean,
    folderPath: { type: String, default: null },
    collectionIndex: { type: Number, default: null },
  },
  data() {
    return {
      name: null,
    }
  },
  methods: {
    addFolder() {
      // TODO: Blocking when name is null ?

      this.$emit("add-folder", {
        name: this.name,
        path: this.folderPath || `${this.collectionIndex}`,
      })
      this.hideModal()
    },
    hideModal() {
      this.name = null
      this.$emit("hide-modal")
    },
  },
})
</script>
