const DEFAULT_TAG = "button"
const ANCHOR_TAG = "a"
const FRAMEWORK_LINK = "NuxtLink" // or "router-link", "g-link"...

const getLinkTag = ({ to, blank }) => {
  if (!to) {
    return DEFAULT_TAG
  } else if (blank) {
    return ANCHOR_TAG
  } else if (/^\/(?!\/).*$/.test(to)) {
    // regex101.com/r/LU1iFL/1
    return FRAMEWORK_LINK
  } else {
    return ANCHOR_TAG
  }
}

export { getLinkTag as default, ANCHOR_TAG, FRAMEWORK_LINK }
