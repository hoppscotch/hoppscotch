export const APP_INFO = {
  name: "Hoppscotch",
  shortDescription: "Open source API development ecosystem",
  description:
    "Helps you create requests faster, saving precious time on development.",
  keywords:
    "hoppscotch, hopp scotch, hoppscotch online, hoppscotch app, postwoman, postwoman chrome, postwoman online, postwoman for mac, postwoman app, postwoman for windows, postwoman google chrome, postwoman chrome app, get postwoman, postwoman web, postwoman android, postwoman app for chrome, postwoman mobile app, postwoman web app, api, request, testing, tool, rest, websocket, sse, graphql, socketio",
  app: {
    background: "#202124",
  },
  social: {
    twitter: "@hoppscotch_io",
  },
} as const

export const META_TAGS = (env: Record<string, string>) => [
  {
    name: "keywords",
    content: APP_INFO.keywords,
  },
  {
    name: "X-UA-Compatible",
    content: "IE=edge, chrome=1",
  },
  {
    itemprop: "name",
    content: `${APP_INFO.name} • ${APP_INFO.shortDescription}`,
  },
  {
    itemprop: "description",
    content: APP_INFO.description,
  },
  {
    itemprop: "image",
    content: `${env.VITE_BASE_URL}/banner.png`,
  },
  // Add to homescreen for Chrome on Android. Fallback for PWA (handled by nuxt)
  {
    name: "application-name",
    content: APP_INFO.name,
  },
  // Windows phone tile icon
  {
    name: "msapplication-TileImage",
    content: `/icon.png`,
  },
  {
    name: "msapplication-TileColor",
    content: APP_INFO.app.background,
  },
  {
    name: "msapplication-tap-highlight",
    content: "no",
  },
]
