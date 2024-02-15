<template>
  <div v-if="pagination" class="flex justify-end mb-3">
    <div class="flex w-min">
      <HoppButtonSecondary
        outline
        filled
        :icon="IconLeft"
        :disabled="page === 1"
        @click="changePage(PageDirection.Previous)"
      />

      <div class="w-10 flex justify-center items-center h-full">
        <p>{{ page }}</p>
      </div>

      <HoppButtonSecondary
        outline
        filled
        :icon="IconRight"
        :disabled="page === pagination.totalPages"
        @click="changePage(PageDirection.Next)"
      />
    </div>
  </div>

  <div class="overflow-auto rounded-md border border-dividerDark shadow-md">
    <div v-if="searchBar" class="flex w-full items-center bg-primary">
      <icon-lucide-search class="ml-3 text-xs" />
      <input
        v-model="searchQuery"
        class="bg-primary p-3 w-full h-full"
        :placeholder="searchBar.placeholder ?? 'Search...'"
      />
    </div>

    <div v-if="isSpinnerEnabled" class="w-5 h-5 text-center mx-auto my-3">
      <HoppSmartSpinner />
    </div>

    <table v-else-if="list" class="w-full">
      <thead v-if="list.length > 0">
        <tr
          class="border-b border-dividerDark bg-primaryLight text-left text-sm text-secondary"
        >
          <th v-if="checkbox" class="pl-6 pt-1 w-5">
            <input
              ref="selectAllCheckbox"
              type="checkbox"
              :checked="areAllRowsSelected"
              @click.stop="toggleAllRows"
            />
          </th>
          <slot name="head">
            <th v-for="th in headings" scope="col" class="px-6 py-3">
              {{ th.label ?? th.key }}
            </th>
          </slot>
        </tr>
      </thead>

      <tbody class="divide-y divide-divider">
        <tr
          v-for="(rowData, rowIndex) in workingList"
          :key="rowIndex"
          class="rounded-xl text-secondaryDark hover:cursor-pointer hover:bg-divider"
          :class="{ 'divide-x divide-divider': showYBorder }"
          @click="onRowClicked(rowData)"
        >
          <td v-if="checkbox" class="my-auto pl-6">
            <input
              type="checkbox"
              :checked="isRowSelected(rowData)"
              @click.stop="toggleRow(rowData)"
            />
          </td>
          <slot name="body" :row="rowData">
            <td
              v-for="cellHeading in headings"
              :key="cellHeading.key"
              @click="!cellHeading.preventClick && onRowClicked(rowData)"
              class="max-w-[10rem] py-1 pl-6"
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
      </tbody>
    </table>
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
    /** Whether to show the search bar */
    searchBar?: {
      /** Whether to debounce the search query event */
      debounce?: number;
      placeholder?: string;
    };
    /** Whether to show the checkbox column
     * This will be overriden if custom implementation for body slot is provided
     */
    checkbox?: boolean;

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

    /** Whether to show the spinner */
    spinner?: {
      enabled: boolean;
      duration?: number;
    };
  }>(),
  {
    showYBorder: false,
    search: undefined,
    checkbox: false,
    sort: undefined,
    selectedRows: undefined,
  }
);

const emit = defineEmits<{
  (event: 'onRowClicked', item: Item): void;
  (event: 'update:list', list: Item[]): void;
  (event: 'search', query: string): void;
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
  if (
    (isPrevious && page.value > 1) ||
    (!isPrevious && page.value < props.pagination!.totalPages)
  ) {
    page.value += isPrevious ? -1 : 1;
  }

  emit('pageNumber', page.value);
};

// The working version of the list that is used to perform operations upon
const workingList = useVModel(props, 'list', emit);

// Spinner functionality
const isSpinnerEnabled = ref(false);
const showSpinner = (duration: number = 500) => {
  isSpinnerEnabled.value = true;
  setTimeout(() => {
    isSpinnerEnabled.value = false;
  }, duration);
};

watch(
  () => props.spinner,
  () => {
    if (props.spinner?.enabled === true) {
      showSpinner(props.spinner.duration);
    }
  }
);

// Checkbox functionality
const selectedRows = useVModel(props, 'selectedRows', emit);

watch(workingList.value, (updatedList) => {
  if (props.checkbox) {
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

  if (item.selected && !isRowSelected(data)) selectedRows.value!.push(data);
  else if (index !== -1) selectedRows.value?.splice(index, 1);
};

const selectAllCheckbox = ref<HTMLInputElement | null>(null);

const toggleAllRows = () => {
  const isChecked = selectAllCheckbox.value?.checked;
  workingList.value.forEach((item) => (item.selected = isChecked));

  if (isChecked) {
    workingList.value.forEach((item) => {
      const { selected, ...data } = item;
      if (!isRowSelected(item)) selectedRows.value!.push(data);
    });
  } else {
    workingList.value.forEach((item) => {
      const { selected, ...data } = item;
      const index =
        selectedRows.value?.findIndex((row) => isEqual(row, data)) ?? -1;
      selectedRows.value!.splice(index, 1);
    });
  }
};

const areAllRowsSelected = computed(() => {
  if (workingList.value.length === 0 || selectedRows.value?.length === 0)
    return false;

  let count = 0;
  workingList.value.forEach((item) => {
    const { selected, ...data } = item;
    if (selectedRows.value?.findIndex((row) => isEqual(row, data)) !== -1) {
      count += 1;
    }
  });
  return count === workingList.value.length;
});

// Sort List by key and direction which can set to ascending or descending
export type Direction = 'ascending' | 'descending';

const sortList = (key: string, direction: Direction) => {
  workingList.value = workingList.value?.sort((a, b) => {
    const valueA = a[key] as string;
    const valueB = b[key] as string;
    return direction === 'ascending'
      ? valueA.localeCompare(valueB)
      : valueB.localeCompare(valueA);
  });
};

watch(workingList.value, () => {
  if (props.sort) {
    sortList(props.sort.key, props.sort.direction);
  }
});

// Searchbar functionality with optional debouncer
const searchQuery = ref('');
let debounceTimeout: NodeJS.Timeout;

const debounce = (func: () => void, delay: number) => {
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(func, delay);
};

watch(searchQuery, () => {
  if (props.searchBar?.debounce) {
    debounce(() => {
      emit('search', searchQuery.value);
    }, props.searchBar.debounce);
  } else {
    emit('search', searchQuery.value);
  }
});
</script>
