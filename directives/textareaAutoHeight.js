export default {
  name: "textareaAutoHeight",
  update(element) {
    if (element.scrollHeight !== element.clientHeight) {
      element.style.minHeight = `${element.scrollHeight}px`;
    }
  }
}
