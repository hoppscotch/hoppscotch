import Vue from 'vue';

export default Vue.directive("textareaAutoHeight", {
  update({ scrollHeight, clientHeight, style }) {
    if (scrollHeight !== clientHeight) {
      style.minHeight = `${scrollHeight}px`;
    }
  }
});
