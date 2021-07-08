<template>
  <div class="flex items-center group">
    <span
      class="
        flex
        justify-center
        items-center
        text-xs
        w-10
        truncate
        cursor-pointer
      "
      @click="$emit('edit-environment')"
    >
      <i class="material-icons">layers</i>
    </span>
    <span
      class="
        py-3
        cursor-pointer
        pr-3
        flex flex-1
        min-w-0
        text-xs
        group-hover:text-secondaryDark
        transition
      "
      @click="$emit('edit-environment')"
    >
      <span class="truncate">
        {{ environment.name }}
      </span>
    </span>
    <tippy
      ref="options"
      interactive
      tabindex="-1"
      trigger="click"
      theme="popover"
      arrow
    >
      <template #trigger>
        <ButtonSecondary
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
