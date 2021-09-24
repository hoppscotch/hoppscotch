// https://github.com/siddharthkp/show-keys/blob/main/index.js

const prettyMap = {
  ArrowUp: "↑",
  ArrowRight: "→",
  ArrowDown: "↓",
  ArrowLeft: "←",
  Shift: "⇧",
  Meta: "⌘",
  Alt: "⌥",
  Control: "^",
  Escape: "esc",
  Backspace: "⌫",
  Enter: "⏎",
  32: "space",
  CapsLock: "caps lock",
  Tab: "tab",
}

let keys = []
let appearedAt = null

const handler = (event) => {
  if (
    window.SHOW_KEYS_SKIP_INPUTS &&
    ["INPUT", "TEXTAREA"].includes(event.target.tagName)
  ) {
    return
  }

  const key =
    prettyMap[event.key] || prettyMap[event.which] || event.key.toUpperCase()

  const modifiers = {
    Meta: event.metaKey,
    Shift: event.shiftKey,
    Alt: event.altKey,
    Control: event.ctrlKey,
  }

  const newKeys = []

  Object.keys(modifiers)
    .filter((modifier) => modifiers[modifier])
    .forEach((modifier) => newKeys.push(prettyMap[modifier]))

  if (!Object.keys(modifiers).includes(event.key)) newKeys.push(key)

  const dismissAfterTimeout = () => {
    // TODO: Should probably clear this timeout
    window.setTimeout(() => {
      if (new Date() - appearedAt < 1000) dismissAfterTimeout()
      else {
        keys = []
        render()
      }
    }, 1000)
  }

  keys = newKeys
  appearedAt = new Date()
  render()
  dismissAfterTimeout()
}

const css = `
  [data-keys] {
    display: flex;
    background: rgba(0, 0, 0, 0.75);
    border-radius: 8px;
    position: fixed;
    bottom: 64px;
    left: 32px;
    padding: 8px 8px 12px;
    font-size: 24px;
    font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen,
      Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;
    animation: keys-zoom-in 50ms;
    z-index: 99999;
  }
  [data-keys][data-children="0"] {
    opacity: 0;
  }
  [data-keys] [data-key] + [data-key] {
    margin-left: 8px;
  }
  [data-keys] [data-key] {
    height: 46px;
    min-width: 32px;
    padding: 16px;
    display: flex;
    justify-content: center;
    align-items: center;
    color: #2e2e2e;
    background: linear-gradient(#fff, #dadada);
    border-radius: 8px;
    border-top: 1px solid #f5f5f5;
    box-shadow: inset 0 0 25px #e8e8e8, 0 1px 0 #c3c3c3, 0 4px 0 #c9c9c9;
    text-shadow: 0px 1px 0px #f5f5f5;
  }
  @keyframes keys-zoom-in {
    from {
      transform: scale(0.9);
    }
    100% {
    }
  }
`

const insertCSS = () => {
  const cssExists = document.head.querySelector("#keyscss")
  if (!cssExists) {
    const cssContainer = document.createElement("style")
    cssContainer.id = "keyscss"
    document.head.append(cssContainer)
    cssContainer.append(css)
  }
}

const ensureContainer = () => {
  let container = document.querySelector("[data-keys]")

  if (!container) {
    container = document.createElement("div")
    container.setAttribute("data-keys", "")
    document.body.append(container)
    return container
  } else {
    return container
  }
}

const render = () => {
  const container = ensureContainer()

  if (keys.length === 0) container.outerHTML = ``
  else {
    container.outerHTML = `
      <div data-keys>
        ${keys.map((key) => `<div data-key>${key}</div>`)}
      </div>
    `
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("keydown", handler)
  insertCSS()
}
