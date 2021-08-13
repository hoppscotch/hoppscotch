<template>
  <div class="flex flex-col">
    <div class="flex items-center group">
      <span
        class="
          cursor-pointer
          flex
          mx-2
          w-12
          justify-center
          items-center
          truncate
        "
        :class="getRequestLabelColor(request.method)"
        @click="!doc ? selectRequest() : {}"
      >
        <i
          v-if="isSelected"
          class="material-icons"
          :class="{ 'text-green-500': isSelected }"
        >
          check_circle
        </i>
        <span v-else>
          {{ request.method }}
        </span>
      </span>
      <span
        class="
          cursor-pointer
          flex flex-1
          min-w-0
          py-2
          pr-2
          transition
          group-hover:text-secondaryDark
        "
        @click="!doc ? selectRequest() : {}"
      >
        <span class="truncate"> {{ request.name }} </span>
      </span>
      <ButtonSecondary
        v-if="!saveRequest && !doc"
        v-tippy="{ theme: 'tooltip' }"
        icon="replay"
        :title="$t('restore')"
        class="group-hover:inline-flex hidden"
        @click.native="!doc ? selectRequest() : {}"
      />
      <tippy
        v-if="collectionsType.selectedTeam.myRole !== 'VIEWER'"
        ref="options"
        interactive
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
          icon="edit"
          :label="$t('edit')"
          @click.native="
            $emit('edit-request', {
              collectionIndex,
              folderIndex,
              folderName,
              request,
              requestIndex,
            })
            $refs.options.tippy().hide()
          "
        />
        <SmartItem
          icon="delete"
          color="red"
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
      :title="$t('confirm.remove_request')"
      @hide-modal="confirmRemove = false"
      @resolve="removeRequest"
    />
  </div>
</template>

<script>
import { translateToNewRequest } from "~/helpers/types/HoppRESTRequest"
import { setRESTRequest } from "~/newstore/RESTSession"

export default {
  props: {
    request: { type: Object, default: () => {} },
    collectionIndex: { type: Number, default: null },
    folderIndex: { type: Number, default: null },
    folderName: { type: String, default: null },
    // eslint-disable-next-line vue/require-default-prop
    requestIndex: [Number, String],
    doc: Boolean,
    saveRequest: Boolean,
    collectionsType: { type: Object, default: () => {} },
    picked: { type: Object, default: () => {} },
  },
  data() {
    return {
      requestMethodLabels: {
        get: "text-green-500",
        post: "text-yellow-500",
        put: "text-blue-500",
        delete: "text-red-500",
        default: "text-gray-500",
      },
      confirmRemove: false,
    }
  },
  computed: {
    isSelected() {
      return (
        this.picked &&
        this.picked.pickedType === "teams-request" &&
        this.picked.requestID === this.requestIndex
      )
    },
  },
  methods: {
    selectRequest() {
      if (this.$props.saveRequest)
        this.$emit("select", {
          picked: {
            pickedType: "teams-request",
            requestID: this.requestIndex,
          },
        })
      else setRESTRequest(translateToNewRequest(this.request))
    },
    removeRequest() {
      this.$emit("remove-request", {
        collectionIndex: this.$props.collectionIndex,
        folderName: this.$props.folderName,
        requestIndex: this.$props.requestIndex,
      })
    },
    getRequestLabelColor(method) {
      return (
        this.requestMethodLabels[method.toLowerCase()] ||
        this.requestMethodLabels.default
      )
    },
  },
}
</script>
