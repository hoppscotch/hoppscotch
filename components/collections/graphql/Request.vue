<template>
  <div>
    <div
      :class="[{ 'bg-primaryDark': dragging }]"
      draggable="true"
      @dragstart="dragStart"
      @dragover.stop
      @dragleave="dragging = false"
      @dragend="dragging = false"
    >
      <div>
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="!doc ? $t('use_request') : ''"
          :class="{ 'mx-3 text-green-400': isSelected }"
          :icon="isSelected ? 'check_circle' : 'description'"
          :label="request.name"
          @click.native="!doc ? selectRequest() : {}"
        />
      </div>
      <tippy tabindex="-1" trigger="click" theme="popover" arrow>
        <template #trigger>
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="$t('more')"
            icon="more_vert"
          />
        </template>
        <div>
          <ButtonSecondary
            icon="edit"
            :label="$t('edit')"
            @click.native="
              $emit('edit-request', {
                request,
                requestIndex,
                folderPath,
              })
            "
          />
        </div>
        <div>
          <ButtonSecondary
            icon="delete"
            :label="$t('delete')"
            @click.native="confirmRemove = true"
          />
        </div>
      </tippy>
    </div>
    <SmartConfirmModal
      :show="confirmRemove"
      :title="$t('are_you_sure_remove_request')"
      @hide-modal="confirmRemove = false"
      @resolve="removeRequest"
    />
  </div>
</template>

<script lang="ts">
import Vue from "vue"
import { removeGraphqlRequest } from "~/newstore/collections"

export default Vue.extend({
  props: {
    // Whether the object is selected (show the tick mark)
    picked: { type: Object, default: null },
    // Whether the request is being saved (activate 'select' event)
    savingMode: { type: Boolean, default: false },
    request: { type: Object, default: () => {} },
    folderPath: { type: String, default: null },
    requestIndex: { type: Number, default: null },
    doc: Boolean,
  },
  data() {
    return {
      dragging: false,
      confirmRemove: false,
    }
  },
  computed: {
    isSelected(): boolean {
      return (
        this.picked &&
        this.picked.pickedType === "gql-my-request" &&
        this.picked.folderPath === this.folderPath &&
        this.picked.requestIndex === this.requestIndex
      )
    },
  },
  methods: {
    pick() {
      this.$emit("select", {
        picked: {
          pickedType: "gql-my-request",
          folderPath: this.folderPath,
          requestIndex: this.requestIndex,
        },
      })
    },
    selectRequest() {
      if (this.savingMode) {
        this.pick()
        return
      }

      this.$store.commit("postwoman/selectGraphqlRequest", {
        request: this.request,
      })
    },
    dragStart({ dataTransfer }: any) {
      this.dragging = !this.dragging

      dataTransfer.setData("folderPath", this.folderPath)
      dataTransfer.setData("requestIndex", this.requestIndex)
    },
    removeRequest() {
      // Cancel pick if the picked request is deleted
      if (
        this.picked &&
        this.picked.pickedType === "gql-my-request" &&
        this.picked.folderPath === this.folderPath &&
        this.picked.requestIndex === this.requestIndex
      ) {
        this.$emit("select", { picked: null })
      }

      removeGraphqlRequest(this.folderPath, this.requestIndex)
      this.$toast.error(this.$t("deleted").toString(), {
        icon: "delete",
      })
      this.confirmRemove = false
    },
  },
})
</script>
