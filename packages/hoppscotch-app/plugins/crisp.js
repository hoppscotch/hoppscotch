export default () => {
  window.$crisp = []
  window.CRISP_WEBSITE_ID = "3ad30257-c192-4773-955d-fb05a4b41af3"
  const d = document
  const s = d.createElement("script")

  s.src = "https://client.crisp.chat/l.js"
  s.async = 1
  d.getElementsByTagName("head")[0].appendChild(s)
  $crisp.push(["do", "chat:hide"])
  $crisp.push([
    "on",
    "chat:closed",
    () => {
      $crisp.push(["do", "chat:hide"])
    },
  ])
}
