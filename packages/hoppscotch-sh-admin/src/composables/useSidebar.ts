import { ref } from 'vue';

/** isOpen is used to indicate whether the sidebar is now visible on the screen */
const isOpen = ref(false);
/** isExpanded is used to indicate whether the sidebar is now expanded to also include page names or the sidebar is compressed to show just the icons  */
const isExpanded = ref(true);

export function useSidebar() {
  return {
    isOpen,
    isExpanded,
  };
}
