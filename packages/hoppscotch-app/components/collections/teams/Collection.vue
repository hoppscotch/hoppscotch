<template>
  <div class="flex flex-col">
    <div class="flex items-center group">
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
        class="
          flex
          group-hover:text-secondaryDark
          flex-1
          min-w-0
          py-2
          pr-2
          transition
          cursor-pointer
        "
        @click="toggleShowChildren()"
      >
        <span class="truncate"> {{ collection.title }} </span>
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
          v-if="collectionsType.selectedTeam.myRole !== 'VIEWER'"
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
                :title="$t('action.more')"
                svg="more-vertical"
              />
            </template>
            <SmartItem
              v-if="collectionsType.selectedTeam.myRole !== 'VIEWER'"
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
              v-if="collectionsType.selectedTeam.myRole !== 'VIEWER'"
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
              v-if="collectionsType.selectedTeam.myRole !== 'VIEWER'"
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
        class="
          flex
          w-1
          transform
          transition
          cursor-nsResize
          ml-5.5
          bg-dividerLight
          hover:scale-x-125 hover:bg-dividerDark
        "
        @click="toggleShowChildren()"
      ></div>
      <div class="flex flex-col flex-1 truncate">
        <CollectionsTeamsFolder
          v-for="(folder, index) in collection.children"
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
          @select="$emit('select', $event)"
          @expand-collection="expandCollection"
          @remove-request="removeRequest"
        />
        <CollectionsTeamsRequest
          v-for="(request, index) in collection.requests"
          :key="`request-${index}`"
          :request="request.request"
          :collection-index="collectionIndex"
          :folder-index="-1"
          :folder-name="collection.name"
          :request-index="request.id"
          :doc="doc"
          :save-request="saveRequest"
          :collections-type="collectionsType"
          :picked="picked"
          @edit-request="editRequest($event)"
          @select="$emit('select', $event)"
          @remove-request="removeRequest"
        />
        <div
          v-if="
            (collection.children == undefined ||
              collection.children.length === 0) &&
            (collection.requests == undefined ||
              collection.requests.length === 0)
          "
          class="
            flex
            text-secondaryLight
            flex-col
            items-center
            justify-center
            p-4
          "
        >
          <img
            :src="`/images/states/${$colorMode.value}/pack.svg`"
            loading="lazy"
            class="
              object-contain
              inline-flex
              flex-col
              object-center
              w-16
              h-16
              mb-4
            "
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
        this.picked.pickedType === "teams-collection" &&
        this.picked.collectionID === this.collection.id
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
    editRequest(event) {
      this.$emit("edit-request", event)
      if (this.$props.saveRequest)
        this.$emit("select", {
          picked: {
            pickedType: "teams-collection",
            collectionID: this.collection.id,
          },
        })
    },
    toggleShowChildren() {
      if (this.$props.saveRequest)
        this.$emit("select", {
          picked: {
            pickedType: "teams-collection",
            collectionID: this.collection.id,
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
    expandCollection(collectionID) {
      this.$emit("expand-collection", collectionID)
    },
    removeRequest({ collectionIndex, folderName, requestIndex }) {
      this.$emit("remove-request", {
        collectionIndex,
        folderName,
        requestIndex,
      })
    },
  },
})
</script>
