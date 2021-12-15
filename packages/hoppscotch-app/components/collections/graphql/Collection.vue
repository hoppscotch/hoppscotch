<template>
  <div class="flex flex-col" :class="[{ 'bg-primaryLight': dragging }]">
    <div
      class="flex items-stretch group"
      @dragover.prevent
      @drop.prevent="dropEvent"
      @dragover="dragging = true"
      @drop="dragging = false"
      @dragleave="dragging = false"
      @dragend="dragging = false"
      @contextmenu.prevent="$refs.options.tippy().show()"
    >
      <span
        class="cursor-pointer flex px-4 items-center justify-center"
        @click="toggleShowChildren()"
      >
        <SmartIcon
          class="svg-icons"
          :class="{ 'text-accent': isSelected }"
          :name="getCollectionIcon"
        />
      </span>
      <span
        class="cursor-pointer flex flex-1 min-w-0 py-2 pr-2 transition group-hover:text-secondaryDark"
        @click="toggleShowChildren()"
      >
        <span class="truncate" :class="{ 'text-accent': isSelected }">
          {{ collection.name }}
        </span>
      </span>
      <div class="flex">
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          svg="folder-plus"
          :title="$t('folder.new')"
          class="hidden group-hover:inline-flex"
          @click.native="
            $emit('add-folder', {
              path: `${collectionIndex}`,
            })
          "
        />
        <span>
          <tippy
            ref="options"
            interactive
            trigger="click"
            theme="popover"
            arrow
          >
            <template #trigger>
              <ButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="$t('action.more')"
                svg="more-vertical"
              />
            </template>
            <SmartItem
              svg="folder-plus"
              :label="`${$t('folder.new')}`"
              @click.native="
                () => {
                  $emit('add-folder', {
                    path: `${collectionIndex}`,
                  })
                  $refs.options.tippy().hide()
                }
              "
            />
            <SmartItem
              svg="edit"
              :label="`${$t('action.edit')}`"
              @click.native="
                () => {
                  $emit('edit-collection')
                  $refs.options.tippy().hide()
                }
              "
            />
            <SmartItem
              svg="trash-2"
              :label="`${$t('action.delete')}`"
              @click.native="
                () => {
                  confirmRemove = true
                  $refs.options.tippy().hide()
                }
              "
            />
          </tippy>
        </span>
      </div>
    </div>
    <div v-if="showChildren || isFiltered" class="flex">
      <div
        class="bg-dividerLight cursor-nsResize flex ml-5.5 transform transition w-1 hover:bg-dividerDark hover:scale-x-125"
        @click="toggleShowChildren()"
      ></div>
      <div class="flex flex-col flex-1 truncate">
        <CollectionsGraphqlFolder
          v-for="(folder, index) in collection.folders"
          :key="`folder-${String(index)}`"
          :picked="picked"
          :saving-mode="savingMode"
          :folder="folder"
          :folder-index="index"
          :folder-path="`${collectionIndex}/${String(index)}`"
          :collection-index="collectionIndex"
          :doc="doc"
          :is-filtered="isFiltered"
          @add-folder="$emit('add-folder', $event)"
          @edit-folder="$emit('edit-folder', $event)"
          @edit-request="$emit('edit-request', $event)"
          @duplicate-request="$emit('duplicate-request', $event)"
          @select="$emit('select', $event)"
        />
        <CollectionsGraphqlRequest
          v-for="(request, index) in collection.requests"
          :key="`request-${String(index)}`"
          :picked="picked"
          :saving-mode="savingMode"
          :request="request"
          :collection-index="collectionIndex"
          :folder-index="-1"
          :folder-name="collection.name"
          :folder-path="`${collectionIndex}`"
          :request-index="index"
          :doc="doc"
          @edit-request="$emit('edit-request', $event)"
          @duplicate-request="$emit('duplicate-request', $event)"
          @select="$emit('select', $event)"
        />
        <div
          v-if="
            collection.folders.length === 0 && collection.requests.length === 0
          "
          class="flex flex-col text-secondaryLight p-4 items-center justify-center"
        >
          <img
            :src="`/images/states/${$colorMode.value}/pack.svg`"
            loading="lazy"
            class="flex-col object-contain object-center h-16 mb-4 w-16 inline-flex"
            :alt="`${$t('empty.collection')}`"
          />
          <span class="text-center">
            {{ $t("empty.collection") }}
          </span>
        </div>
      </div>
    </div>
    <SmartConfirmModal
      :show="confirmRemove"
      :title="`${$t('confirm.remove_collection')}`"
      @hide-modal="confirmRemove = false"
      @resolve="removeCollection"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "@nuxtjs/composition-api"
import {
  removeGraphqlCollection,
  moveGraphqlRequest,
} from "~/newstore/collections"

export default defineComponent({
  props: {
    picked: { type: Object, default: null },
    // Whether the viewing context is related to picking (activates 'select' events)
    savingMode: { type: Boolean, default: false },
    collectionIndex: { type: Number, default: null },
    collection: { type: Object, default: () => {} },
    doc: Boolean,
    isFiltered: Boolean,
  },
  data() {
    return {
      showChildren: false,
      dragging: false,
      selectedFolder: {},
      confirmRemove: false,
    }
  },
  computed: {
    isSelected(): boolean {
      return (
        this.picked &&
        this.picked.pickedType === "gql-my-collection" &&
        this.picked.collectionIndex === this.collectionIndex
      )
    },
    getCollectionIcon() {
      if (this.isSelected) return "check-circle"
      else if (!this.showChildren && !this.isFiltered) return "folder"
      else if (this.showChildren || this.isFiltered) return "folder-open"
      else return "folder"
    },
  },
  methods: {
    pick() {
      this.$emit("select", {
        picked: {
          pickedType: "gql-my-collection",
          collectionIndex: this.collectionIndex,
        },
      })
    },
    toggleShowChildren() {
      if (this.savingMode) {
        this.pick()
      }

      this.showChildren = !this.showChildren
    },
    removeCollection() {
      // Cancel pick if picked collection is deleted
      if (
        this.picked &&
        this.picked.pickedType === "gql-my-collection" &&
        this.picked.collectionIndex === this.collectionIndex
      ) {
        this.$emit("select", { picked: null })
      }
      removeGraphqlCollection(this.collectionIndex)
      this.$toast.success(`${this.$t("state.deleted")}`)
    },
    dropEvent({ dataTransfer }: any) {
      this.dragging = !this.dragging

      const folderPath = dataTransfer.getData("folderPath")
      const requestIndex = dataTransfer.getData("requestIndex")

      moveGraphqlRequest(folderPath, requestIndex, `${this.collectionIndex}`)
    },
  },
})
</script>
