<template>
  <div class="flex flex-1 flex-col">
    <div v-if="pagination" class="mb-3 flex items-center justify-end">
      <HoppButtonSecondary
        outline
        filled
        :icon="IconLeft"
        :disabled="page === 1"
        @click="changePage(PageDirection.Previous)"
      />

      <span class="flex h-full w-10 items-center justify-center">{{
        page
      }}</span>

      <HoppButtonSecondary
        outline
        filled
        :icon="IconRight"
        :disabled="page === pagination.totalPages"
        @click="changePage(PageDirection.Next)"
      />
    </div>

    <div class="overflow-auto rounded-md border border-dividerDark shadow-md">
      <!-- An Extension Slot to extend the table functionality such as search   -->
      <slot name="extension"></slot>

      <table class="w-full table-fixed">
        <thead>
          <tr
            class="border-b border-dividerDark bg-primaryLight text-left text-sm text-secondary"
          >
            <th v-if="selectedRows" class="w-24">
              <input
                ref="selectAllCheckbox"
                type="checkbox"
                :checked="areAllRowsSelected"
                :disabled="loading"
                class="flex h-full w-full items-center justify-center"
                @click.stop="toggleAllRows"
              />
            </th>
            <slot name="head">
              <th
                v-for="th in headings"
                :key="th.key"
                scope="col"
                class="px-6 py-3"
              >
                {{ th.label ?? th.key }}
              </th>
            </slot>
          </tr>
        </thead>

        <tbody class="divide-y divide-divider">
          <tr v-if="loading">
            <slot name="loading-state">
              <td :colspan="columnSpan">
                <div class="mx-auto my-3 h-5 w-5 text-center">
                  <HoppSmartSpinner />
                </div>
              </td>
            </slot>
          </tr>

          <tr v-else-if="!list.length">
            <slot name="empty-state">
              <td :colspan="columnSpan" class="py-3 text-center">
                <p>No data available</p>
              </td>
            </slot>
          </tr>

          <template v-else>
            <tr
              v-for="(rowData, rowIndex) in workingList"
              :key="rowIndex"
              class="rounded-xl text-secondaryDark hover:cursor-pointer hover:bg-divider"
              :class="{ 'divide-x divide-divider': showYBorder }"
              @click="onRowClicked(rowData)"
            >
              <td v-if="selectedRows">
                <input
                  type="checkbox"
                  :checked="isRowSelected(rowData)"
                  class="flex h-full w-full items-center justify-center"
                  @click.stop="toggleRow(rowData)"
                />
              </td>
              <slot name="body" :row="rowData">
                <td
                  v-for="cellHeading in headings"
                  :key="cellHeading.key"
                  class="px-4 py-2"
                  @click="!cellHeading.preventClick && onRowClicked(rowData)"
                >
                  <!-- Dynamic column slot -->
                  <slot :name="cellHeading.key" :item="rowData">
                    <!-- Generic implementation of the column -->
                    <div class="flex flex-col truncate">
                      <span class="truncate">
                        {{ rowData[cellHeading.key] ?? '-' }}
                      </span>
                    </div>
                  </slot>
                </td>
              </slot>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useVModel } from '@vueuse/core';
import { isEqual } from 'lodash-es';
import { computed, ref, watch } from 'vue';

import IconLeft from '~icons/lucide/arrow-left';
import IconRight from '~icons/lucide/arrow-right';

export type CellHeading = {
  key: string;
  label?: string;
  preventClick?: boolean;
};

export type Item = Record<string, unknown>;

const props = withDefaults(
  defineProps<{
    /** Whether to show the vertical border between columns */
    showYBorder?: boolean;
    /**  The list of items to be displayed in the table */
    list: Item[];
    /** The headings of the table */
    headings?: CellHeading[];

    selectedRows?: Item[];
    /** Whether to enable sorting */
    sort?: {
      /** The key to sort the list by */
      key: string;
      direction: Direction;
    };

    /** Whether to enable pagination */
    pagination?: {
      totalPages: number;
    };

    /** Whether to show a loading spinner */
    loading?: boolean;
  }>(),
  {
    showYBorder: false,
    sort: undefined,
    selectedRows: undefined,
    loading: false,
  }
);

const emit = defineEmits<{
  (event: 'onRowClicked', item: Item): void;
  (event: 'update:list', list: Item[]): void;
  (event: 'update:selectedRows', selectedRows: Item[]): void;
  (event: 'pageNumber', page: number): void;
}>();

// Pagination functionality
const page = ref(1);

enum PageDirection {
  Previous,
  Next,
}

const changePage = (direction: PageDirection) => {
  const isPrevious = direction === PageDirection.Previous;

  const isValidPreviousAction = isPrevious && page.value > 1;
  const isValidNextAction =
    !isPrevious && page.value < props.pagination!.totalPages;

  if (isValidNextAction || isValidPreviousAction) {
    page.value += isPrevious ? -1 : 1;

    emit('pageNumber', page.value);
  }
};

// The working version of the list that is used to perform operations upon
const workingList = useVModel(props, 'list', emit);

// Checkbox functionality
const selectedRows = useVModel(props, 'selectedRows', emit);

watch(workingList.value, (updatedList) => {
  if (props.selectedRows) {
    updatedList = updatedList.map((item) => ({
      ...item,
      selected: false,
    }));
  }
});

const onRowClicked = (item: Item) => emit('onRowClicked', item);

const isRowSelected = (item: Item) => {
  const { selected, ...data } = item;
  return selectedRows.value?.some((row) => isEqual(row, data));
};

const toggleRow = (item: Item) => {
  item.selected = !item.selected;
  const { selected, ...data } = item;

  const index =
    selectedRows.value?.findIndex((row) => isEqual(row, data)) ?? -1;

  if (item.selected && !isRowSelected(data)) {
    selectedRows.value!.push(data);
  } else if (index !== -1) {
    selectedRows.value?.splice(index, 1);
  }
};

const selectAllCheckbox = ref<HTMLInputElement | null>(null);

const toggleAllRows = () => {
  const isChecked = selectAllCheckbox.value?.checked;
  workingList.value.forEach((item) => {
    item.selected = isChecked;
    const { selected, ...data } = item;
    if (isChecked) {
      if (!isRowSelected(item)) {
        selectedRows.value!.push(data);
      }
      return;
    }
    const index =
      selectedRows.value?.findIndex((row) => isEqual(row, data)) ?? -1;
    selectedRows.value!.splice(index, 1);
  });
};

const areAllRowsSelected = computed(() => {
  if (workingList.value.length === 0 || selectedRows.value?.length === 0)
    return false;
  return workingList.value.every((item) => {
    const { selected, ...data } = item;
    return selectedRows.value?.some((row) => isEqual(row, data));
  });
});

// Sort List by key and direction which can set to ascending or descending
export type Direction = 'ascending' | 'descending';

const sortList = (key: string, direction: Direction) => {
  workingList.value.sort((a, b) => {
    const valueA = a[key] as string;
    const valueB = b[key] as string;
    return direction === 'ascending'
      ? valueA.localeCompare(valueB)
      : valueB.localeCompare(valueA);
  });
};

watch(
  () => props.sort?.direction,
  () => {
    if (props.sort) {
      sortList(props.sort.key, props.sort.direction);
    }
  },
  { immediate: true }
);

const columnSpan = computed(
  () => (props.headings?.length ?? 0) + (props.selectedRows ? 1 : 0)
);
</script>
