// Debounce is a higher order function which makes its enclosed function be executed
// only if the function wasn't called again till 'delay' time has passed, this helps reduce impact of heavy working
// functions which might be called frequently
// NOTE : Don't use lambda functions as this doesn't get bound properly in them, use the 'function (args) {}' format
const debounce = (func, delay) => {
  let inDebounce
  return function () {
    const context = this
    const args = arguments
    clearTimeout(inDebounce)
    inDebounce = setTimeout(() => func.apply(context, args), delay)
  }
}

export default debounce
