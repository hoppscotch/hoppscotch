export default {
  name: 'textareaAutoHeight',
  update({ scrollHeight, clientHeight, style }) {
    if (scrollHeight !== clientHeight) {
      style.minHeight = `${scrollHeight}px`
    }
  },
}
