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
      @contextmenu.prevent="options.tippy().show()"
    >
      <span
        class="flex items-center justify-center px-4 cursor-pointer"
        @click="toggleShowChildren()"
      >
        <SmartIcon
          class="svg-icons"
          :class="{ 'text-accent': isSelected }"
          :name="getCollectionIcon"
        />
      </span>
      <span
        class="flex flex-1 min-w-0 py-2 pr-2 cursor-pointer transition group-hover:text-secondaryDark"
        @click="toggleShowChildren()"
      >
        <span class="truncate" :class="{ 'text-accent': isSelected }">
          {{ collection.name }}
        </span>
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
          class="hidden group-hover:inline-flex"
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
            :on-shown="() => tippyActions.focus()"
          >
            <template #trigger>
              <ButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="$t('action.more')"
                svg="more-vertical"
              />
            </template>
            <div
              ref="tippyActions"
              class="flex flex-col focus:outline-none"
              tabindex="0"
              @keyup.n="folderAction.$el.click()"
              @keyup.e="edit.$el.click()"
              @keyup.delete="deleteAction.$el.click()"
              @keyup.x="exportAction.$el.click()"
              @keyup.escape="options.tippy().hide()"
            >
              <SmartItem
                ref="folderAction"
                svg="folder-plus"
                :label="$t('folder.new')"
                :shortcut="['N']"
                @click.native="
                  () => {
                    $emit('add-folder', {
                      folder: collection,
                      path: `${collectionIndex}`,
                    })
                    options.tippy().hide()
                  }
                "
              />
              <SmartItem
                ref="edit"
                svg="edit"
                :label="$t('action.edit')"
                :shortcut="['E']"
                @click.native="
                  () => {
                    $emit('edit-collection')
                    options.tippy().hide()
                  }
                "
              />
              <SmartItem
                ref="deleteAction"
                svg="trash-2"
                :label="$t('action.delete')"
                :shortcut="['⌫']"
                @click.native="
                  () => {
                    confirmRemove = true
                    options.tippy().hide()
                  }
                "
              />
              <SmartItem
                ref="exportAction"
                svg="download"
                :label="$t('export.as_json')"
                :shortcut="['X']"
                @click.native="
                  () => {
                    $emit('export-collection')
                    options.tippy().hide()
                  }
                "
              />
            </div>
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
          class="flex flex-col items-center justify-center p-4 text-secondaryLight"
        >
          <img
            :src="`/images/states/${$colorMode.value}/pack.svg`"
            loading="lazy"
            class="inline-flex flex-col object-contain object-center w-16 h-16 mb-4"
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
      :title="$t('confirm.remove_collection')"
      @hide-modal="confirmRemove = false"
      @resolve="removeCollection"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from "@nuxtjs/composition-api"
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
  setup() {
    return {
      tippyActions: ref<any | null>(null),
      options: ref<any | null>(null),
      folderAction: ref<any | null>(null),
      edit: ref<any | null>(null),
      deleteAction: ref<any | null>(null),
      exportAction: ref<any | null>(null),
    }
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
    isSelected(): boolean {
      return (
        this.picked &&
        this.picked.pickedType === "my-collection" &&
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
