<template>
  <div>
    <div class="flex flex-1">
      <div>
        <ButtonSecondary
          icon="layers"
          :label="environment.name"
          @click.native="$emit('edit-environment')"
        />
      </div>
      <tippy ref="options" tabindex="-1" trigger="click" theme="popover" arrow>
        <template #trigger>
          <TabPrimary
            v-tippy="{ theme: 'tooltip' }"
            :title="$t('more')"
            icon="more_vert"
          />
        </template>
        <SmartItem
          icon="create"
          :label="$t('edit')"
          @click.native="
            $emit('edit-environment')
            $refs.options.tippy().hide()
          "
        />
        <SmartItem
          icon="delete"
          :label="$t('delete')"
          @click.native="
            confirmRemove = true
            $refs.options.tippy().hide()
          "
        />
      </tippy>
    </div>
    <SmartConfirmModal
      :show="confirmRemove"
      :title="$t('are_you_sure_remove_environment')"
      @hide-modal="confirmRemove = false"
      @resolve="removeEnvironment"
    />
  </div>
</template>

<script lang="ts">
import Vue from "vue"
import { deleteEnvironment } from "~/newstore/environments"

export default Vue.extend({
  props: {
    environment: { type: Object, default: () => {} },
    environmentIndex: { type: Number, default: null },
  },
  data() {
    return {
      confirmRemove: false,
    }
  },
  methods: {
    removeEnvironment() {
      deleteEnvironment(this.environmentIndex)
      this.$toast.error(this.$t("deleted").toString(), {
        icon: "delete",
      })
    },
  },
})
</script>
