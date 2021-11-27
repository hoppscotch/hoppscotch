<template>
  <div class="flex flex-col" :class="[{ 'bg-primaryLight': dragging }]">
    <div
      class="group flex items-center"
      @dragover.prevent
      @drop.prevent="dropEvent"
      @dragover="dragging = true"
      @drop="dragging = false"
      @dragleave="dragging = false"
      @dragend="dragging = false"
    >
      <span
        class="flex items-center justify-center px-4 cursor-pointer"
        @click="toggleShowChildren()"
      >
        <SmartIcon
          class="svg-icons"
          :class="{ 'text-green-500': isSelected }"
          :name="getCollectionIcon"
        />
      </span>
      <span
        class="group-hover:text-secondaryDark flex flex-1 min-w-0 py-2 pr-2 transition cursor-pointer"
        @click="toggleShowChildren()"
      >
        <span class="truncate"> {{ collection.name }} </span>
      </span>
      <div class="flex">
        <ButtonSecondary
          v-if="doc && !selected"
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('import.title')"
          svg="circle"
          color="green"
          @click.native="$emit('select-collection')"
        />
        <ButtonSecondary
          v-if="doc && selected"
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('action.remove')"
          svg="check-circle"
          color="green"
          @click.native="$emit('unselect-collection')"
        />
        <ButtonSecondary
          v-if="!doc"
          v-tippy="{ theme: 'tooltip' }"
          svg="folder-plus"
          :title="$t('folder.new')"
          class="group-hover:inline-flex hidden"
          @click.native="
            $emit('add-folder', {
              folder: collection,
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
              :label="$t('folder.new')"
              @click.native="
                () => {
                  $emit('add-folder', {
                    folder: collection,
                    path: `${collectionIndex}`,
                  })
                  $refs.options.tippy().hide()
                }
              "
            />
            <SmartItem
              svg="edit"
              :label="$t('action.edit')"
              @click.native="
                () => {
                  $emit('edit-collection')
                  $refs.options.tippy().hide()
                }
              "
            />
            <SmartItem
              svg="trash-2"
              color="red"
              :label="$t('action.delete')"
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
        class="flex w-1 transform transition cursor-nsResize ml-5.5 bg-dividerLight hover:scale-x-125 hover:bg-dividerDark"
        @click="toggleShowChildren()"
      ></div>
      <div class="flex flex-col flex-1 truncate">
        <CollectionsMyFolder
          v-for="(folder, index) in collection.folders"
          :key="`folder-${index}`"
          :folder="folder"
          :folder-index="index"
          :folder-path="`${collectionIndex}/${index}`"
          :collection-index="collectionIndex"
          :doc="doc"
          :save-request="saveRequest"
          :collections-type="collectionsType"
          :is-filtered="isFiltered"
          :picked="picked"
          @add-folder="$emit('add-folder', $event)"
          @edit-folder="$emit('edit-folder', $event)"
          @edit-request="$emit('edit-request', $event)"
          @duplicate-request="$emit('duplicate-request', $event)"
          @select="$emit('select', $event)"
          @remove-request="$emit('remove-request', $event)"
        />
        <CollectionsMyRequest
          v-for="(request, index) in collection.requests"
          :key="`request-${index}`"
          :request="request"
          :collection-index="collectionIndex"
          :folder-index="-1"
          :folder-name="collection.name"
          :folder-path="`${collectionIndex}`"
          :request-index="index"
          :doc="doc"
          :save-request="saveRequest"
          :collections-type="collectionsType"
          :picked="picked"
          @edit-request="$emit('edit-request', $event)"
          @duplicate-request="$emit('duplicate-request', $event)"
          @select="$emit('select', $event)"
          @remove-request="$emit('remove-request', $event)"
        />
        <div
          v-if="
            (collection.folders == undefined ||
              collection.folders.length === 0) &&
            (collection.requests == undefined ||
              collection.requests.length === 0)
          "
          class="text-secondaryLight flex flex-col items-center justify-center p-4"
        >
          <img
            :src="`/images/states/${$colorMode.value}/pack.svg`"
            loading="lazy"
            class="inline-flex flex-col object-contain object-center w-16 h-16 mb-4"
            :alt="$t('empty.collection')"
          />
          <span class="text-center">
            {{ $t("empty.collection") }}
          </span>
        </div>
      </div>
    </div>
    <SmartConfirmModal
      :show="confirmRemove"
      :title="$t('confirm.remove_collection')"
      @hide-modal="confirmRemove = false"
      @resolve="removeCollection"
    />
  </div>
</template>

<script>
import { defineComponent } from "@nuxtjs/composition-api"
import { moveRESTRequest } from "~/newstore/collections"

export default defineComponent({
  props: {
    collectionIndex: { type: Number, default: null },
    collection: { type: Object, default: () => {} },
    doc: Boolean,
    isFiltered: Boolean,
    selected: Boolean,
    saveRequest: Boolean,
    collectionsType: { type: Object, default: () => {} },
    picked: { type: Object, default: () => {} },
  },
  data() {
    return {
      showChildren: false,
      dragging: false,
      selectedFolder: {},
      confirmRemove: false,
      prevCursor: "",
      cursor: "",
      pageNo: 0,
    }
  },
  computed: {
    isSelected() {
      return (
        this.picked &&
        this.picked.pickedType === "my-collection" &&
        this.picked.collectionIndex === this.collectionIndex
      )
    },
    getCollectionIcon() {
      if (this.isSelected) return "check-circle"
      else if (!this.showChildren && !this.isFiltered) return "folder"
      else if (this.showChildren || this.isFiltered) return "folder-minus"
      else return "folder"
    },
  },
  methods: {
    toggleShowChildren() {
      if (this.$props.saveRequest)
        this.$emit("select", {
          picked: {
            pickedType: "my-collection",
            collectionIndex: this.collectionIndex,
          },
        })

      this.$emit("expand-collection", this.collection.id)
      this.showChildren = !this.showChildren
    },
    removeCollection() {
      this.$emit("remove-collection", {
        collectionsType: this.collectionsType,
        collectionIndex: this.collectionIndex,
        collectionID: this.collection.id,
      })
    },
    dropEvent({ dataTransfer }) {
      this.dragging = !this.dragging
      const folderPath = dataTransfer.getData("folderPath")
      const requestIndex = dataTransfer.getData("requestIndex")
      moveRESTRequest(folderPath, requestIndex, `${this.collectionIndex}`)
    },
  },
})
</script>
